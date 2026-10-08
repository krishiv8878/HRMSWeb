import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsGoalDto, PmsService } from '../../../services/pms/pms.service';
import { EmployeeService } from '../../../services/employee/employee.service';
import { RbacService } from '../../../core/rbac.service';

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './goal-modal.component.html',
  styleUrls: ['./goal-modal.component.scss']
})
export class GoalModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<GoalModalComponent>);
  public data: { goalDto?: PmsGoalDto; employeeId?: number } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;
  isAdminOrManager = false;
  allEmployees: any[] = [];
  currentEmpId: number = 0;

  periods = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Annual 2026', 'Annual 2027'];
  categories = ['Individual', 'Department', 'Company'];
  metricUnits = ['%', 'Tasks', 'Score', 'Units', 'Revenue'];

  goalForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    employeeId: [null, [Validators.required]],
    category: ['Individual', [Validators.required]],
    department: [''],
    period: ['Q4 2026', [Validators.required]],
    weightage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
    dueDate: [''],
    keyResults: this.fb.array([])
  });

  get keyResultsArray(): FormArray {
    return this.goalForm.get('keyResults') as FormArray;
  }

  ngOnInit(): void {
    this.isAdminOrManager = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;

    this.employeeService.getData().subscribe({
      next: (res: any) => {
        this.allEmployees = (res?.data || res || []).filter((e: any) => !e.isDelete);
      },
      error: () => {}
    });

    if (this.data?.goalDto) {
      this.isEditMode = true;
      const g = this.data.goalDto.goal;
      this.goalForm.patchValue({
        title: g.title,
        description: g.description,
        employeeId: g.employeeId,
        category: g.category,
        department: g.department,
        period: g.period,
        weightage: g.weightage,
        dueDate: g.dueDate ? g.dueDate.substring(0, 10) : ''
      });

      if (this.data.goalDto.keyResults && this.data.goalDto.keyResults.length > 0) {
        this.data.goalDto.keyResults.forEach(kr => {
          this.addKeyResult(kr.title, kr.targetValue, kr.currentValue, kr.metricUnit, kr.weightage, kr.id);
        });
      } else {
        this.addKeyResult('Complete primary milestone', 100, 0, '%', 100);
      }
    } else {
      this.goalForm.patchValue({
        employeeId: this.data?.employeeId || this.currentEmpId || null,
        dueDate: new Date(Date.now() + 90 * 86400000).toISOString().substring(0, 10)
      });
      this.addKeyResult('Achieve target milestone', 100, 0, '%', 100);
    }
  }

  addKeyResult(title = '', target = 100, current = 0, unit = '%', weight = 100, id?: number): void {
    this.keyResultsArray.push(this.fb.group({
      id: [id || 0],
      title: [title, [Validators.required]],
      targetValue: [target, [Validators.required, Validators.min(1)]],
      currentValue: [current, [Validators.min(0)]],
      metricUnit: [unit, [Validators.required]],
      weightage: [weight, [Validators.required, Validators.min(1), Validators.max(100)]]
    }));
  }

  removeKeyResult(index: number): void {
    if (this.keyResultsArray.length <= 1) {
      this.toaster.warning('Goal must have at least one measurable Key Result');
      return;
    }
    this.keyResultsArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      this.toaster.warning('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.goalForm.value;

    const payload = {
      ...formVal,
      employeeId: Number(formVal.employeeId),
      weightage: Number(formVal.weightage),
      dueDate: formVal.dueDate ? new Date(formVal.dueDate).toISOString() : null,
      keyResults: formVal.keyResults.map((kr: any) => ({
        id: Number(kr.id) || 0,
        title: kr.title,
        targetValue: Number(kr.targetValue),
        currentValue: Number(kr.currentValue),
        metricUnit: kr.metricUnit,
        weightage: Number(kr.weightage)
      }))
    };

    if (this.isEditMode && this.data?.goalDto?.goal?.id) {
      this.pmsService.updateGoal(this.data.goalDto.goal.id, { id: this.data.goalDto.goal.id, ...payload }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toaster.success('Goal & Key Results updated successfully');
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toaster.error(err?.error?.message || 'Failed to update goal');
        }
      });
    } else {
      this.pmsService.createGoal(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toaster.success('Goal & OKRs created successfully');
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toaster.error(err?.error?.message || 'Failed to create goal');
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
