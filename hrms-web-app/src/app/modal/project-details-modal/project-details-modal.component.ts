import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ProjectItem } from '../../component/projectmaster/projectmaster.component';
import { EmployeeService } from '../../services/employee/employee.service';

export interface ProjectDetailsData {
  project: ProjectItem;
  teamMembers: any[];
}

@Component({
  selector: 'app-project-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './project-details-modal.component.html',
  styleUrl: './project-details-modal.component.scss'
})
export class ProjectDetailsModalComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectDetailsModalComponent>);
  private employeeService = inject(EmployeeService);

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProjectDetailsData) {}

  ngOnInit() {
    const mgrId = this.project?.projectManagerId || this.project?.managerId;
    if (mgrId && (!this.project.managerName || this.project.managerName.startsWith('Manager #'))) {
      this.employeeService.getEmployeeById(mgrId).subscribe({
        next: (res: any) => {
          const emp = res?.data || res;
          if (emp) {
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.fullName;
            if (fullName) {
              this.project.managerName = fullName;
            }
          }
        }
      });
    }
  }

  get project(): ProjectItem {
    return this.data.project;
  }

  get teamMembers(): any[] {
    return this.data.teamMembers || [];
  }

  getInitials(name: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  closeModal() {
    this.dialogRef.close();
  }
}
