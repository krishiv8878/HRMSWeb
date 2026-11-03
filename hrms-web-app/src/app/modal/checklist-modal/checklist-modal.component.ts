import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { ChecklistService, EmployeeChecklist, ChecklistTask, AssetReturnVerification } from '../../services/checklist/checklist.service';
import { EmployeeService } from '../../services/employee/employee.service';

export interface ChecklistModalData {
  checklistId?: number;
  employeeId?: number;
  checklistType?: string; // 'Onboarding' or 'Offboarding'
  employeeName?: string;
}

@Component({
  selector: 'app-checklist-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './checklist-modal.component.html',
  styleUrl: './checklist-modal.component.scss'
})
export class ChecklistModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ChecklistModalComponent>);
  private checklistService = inject(ChecklistService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isLoading: boolean = true;
  checklist: EmployeeChecklist | null = null;
  filteredTasks: ChecklistTask[] = [];
  selectedCategory: string = 'All';
  categories: string[] = ['All', 'Employee', 'HR', 'IT', 'Manager', 'Finance'];

  assetVerification: AssetReturnVerification | null = null;

  activeTaskForAction: ChecklistTask | null = null;
  actionRemarks: string = '';
  actionStatus: string = 'Completed';

  // Task reassignment
  reassignTaskId: number | null = null;
  selectedAssigneeId: number | null = null;
  employeesList: any[] = [];
  isAdminOrHr: boolean = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ChecklistModalData) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('userRole') || localStorage.getItem('role') || '').toLowerCase();
    this.isAdminOrHr = role.includes('admin') || role.includes('hr');
    if (this.isAdminOrHr) {
      this.loadEmployeeLookup();
    }
    this.loadChecklist();
  }

  loadEmployeeLookup(): void {
    this.employeeService.getLookup().subscribe({
      next: (res: any) => {
        this.employeesList = res?.data || res || [];
      },
      error: () => {}
    });
  }

  loadChecklist(): void {
    this.isLoading = true;
    if (this.data.checklistId) {
      this.checklistService.getChecklistById(this.data.checklistId).subscribe({
        next: (res: any) => {
          this.checklist = res?.data || res;
          this.filterTasks();
          if (this.checklist && this.checklist.checklistType?.toLowerCase() === 'offboarding') {
            this.loadAssetClearance(this.checklist.employeeId);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          this.toaster.error('Failed to load checklist details');
          this.isLoading = false;
        }
      });
    } else if (this.data.employeeId) {
      this.checklistService.getEmployeeChecklists(this.data.employeeId, this.data.checklistType).subscribe({
        next: (res: any) => {
          const list: EmployeeChecklist[] = res?.data || res || [];
          if (list.length > 0) {
            this.checklist = list[0];
            this.filterTasks();
            if (this.checklist.checklistType?.toLowerCase() === 'offboarding') {
              this.loadAssetClearance(this.checklist.employeeId);
            } else {
              this.isLoading = false;
            }
          } else {
            // Instantiate checklist if none exists
            const type = this.data.checklistType || 'Onboarding';
            this.checklistService.instantiateChecklist(this.data.employeeId!, type).subscribe({
              next: (instRes: any) => {
                this.checklist = instRes?.data || instRes;
                this.filterTasks();
                this.isLoading = false;
              },
              error: () => {
                this.toaster.error('No checklist found and auto-initialization failed');
                this.isLoading = false;
              }
            });
          }
        },
        error: () => {
          this.toaster.error('Failed to load employee checklists');
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  loadAssetClearance(employeeId: number): void {
    this.checklistService.verifyAssetClearance(employeeId).subscribe({
      next: (res: any) => {
        this.assetVerification = res?.data || res;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterTasks(): void {
    if (!this.checklist) return;
    if (this.selectedCategory === 'All') {
      this.filteredTasks = [...this.checklist.tasks];
    } else {
      this.filteredTasks = this.checklist.tasks.filter(
        t => t.category?.toLowerCase() === this.selectedCategory.toLowerCase()
      );
    }
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.filterTasks();
  }

  openTaskAction(task: ChecklistTask, targetStatus: string): void {
    this.activeTaskForAction = task;
    this.actionStatus = targetStatus;
    this.actionRemarks = (targetStatus === 'Waived' || targetStatus === 'Waive') ? (task.waiveReason || '') : (task.remarks || '');
  }

  cancelTaskAction(): void {
    this.activeTaskForAction = null;
    this.actionRemarks = '';
  }

  confirmTaskAction(): void {
    if (!this.activeTaskForAction) return;

    const isWaive = this.actionStatus === 'Waived' || this.actionStatus === 'Waive';
    const statusToSave = isWaive ? 'Waived' : 'Completed';

    if (isWaive && (!this.actionRemarks || !this.actionRemarks.trim())) {
      this.toaster.error('A mandatory justification reason is required to waive a checklist task.', 'Reason Required');
      return;
    }

    const taskId = this.activeTaskForAction.id;
    this.checklistService.updateTaskStatus(taskId, {
      status: statusToSave,
      remarks: this.actionRemarks,
      waiveReason: isWaive ? this.actionRemarks.trim() : undefined
    }).subscribe({
      next: () => {
        this.toaster.success(`Task '${this.activeTaskForAction?.taskName}' marked as ${statusToSave}`);
        this.activeTaskForAction = null;
        this.loadChecklist();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'Failed to update task status');
      }
    });
  }

  openReassign(task: ChecklistTask): void {
    this.reassignTaskId = task.id;
    this.selectedAssigneeId = task.assignedEmployeeId || null;
  }

  cancelReassign(): void {
    this.reassignTaskId = null;
    this.selectedAssigneeId = null;
  }

  confirmReassign(): void {
    if (!this.reassignTaskId) return;

    this.checklistService.updateTaskAssignee(this.reassignTaskId, {
      assignedEmployeeId: this.selectedAssigneeId ? Number(this.selectedAssigneeId) : undefined
    }).subscribe({
      next: () => {
        this.toaster.success('Task assignee updated successfully');
        this.reassignTaskId = null;
        this.selectedAssigneeId = null;
        this.loadChecklist();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'Failed to reassign task');
      }
    });
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
