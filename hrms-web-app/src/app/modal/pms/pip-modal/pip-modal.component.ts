import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsPipDto, PmsService } from '../../../services/pms/pms.service';
import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-pip-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './pip-modal.component.html',
  styleUrls: ['./pip-modal.component.scss']
})
export class PipModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<PipModalComponent>);
  public data: { pipDto?: PmsPipDto } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;
  allEmployees: any[] = [];

  pipForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(15)]],
    durationDays: [30, [Validators.required]],
    startDate: ['', [Validators.required]],
    checkInFrequency: ['Weekly', [Validators.required]],
    outcome: ['Active'],
    finalComments: [''],
    status: ['Active'],
    objectives: this.fb.array([])
  });

  get objectivesArray(): FormArray {
    return this.pipForm.get('objectives') as FormArray;
  }

  ngOnInit(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        this.allEmployees = (res?.data || res || []).filter((e: any) => !e.isDelete);
      },
      error: () => {}
    });

    if (this.data?.pipDto) {
      this.isEditMode = true;
      const p = this.data.pipDto.pip;
      this.pipForm.patchValue({
        employeeId: p.employeeId,
        reason: p.reason,
        durationDays: p.durationDays,
        startDate: p.startDate ? p.startDate.substring(0, 10) : '',
        checkInFrequency: p.checkInFrequency,
        outcome: p.outcome,
        finalComments: p.finalComments || '',
        status: p.status
      });

      if (p.objectivesJson) {
        try {
          const objs = JSON.parse(p.objectivesJson);
          if (Array.isArray(objs)) {
            objs.forEach(o => this.addObjective(typeof o === 'string' ? o : o.text, Boolean(o.completed)));
          }
        } catch (e) {}
      }
    } else {
      this.pipForm.patchValue({
        startDate: new Date().toISOString().substring(0, 10)
      });
      this.addObjective('Achieve >95% SLA turnaround time on assigned sprint tickets', false);
      this.addObjective('Participate actively in weekly code reviews without blocker regressions', false);
    }
  }

  addObjective(text = '', completed = false): void {
    this.objectivesArray.push(this.fb.group({
      text: [text, [Validators.required]],
      completed: [completed]
    }));
  }

  removeObjective(index: number): void {
    this.objectivesArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.pipForm.invalid) {
      this.pipForm.markAllAsTouched();
      this.toaster.warning('Please enter all required PIP details');
      return;
    }

    this.isSubmitting = true;
    const val = this.pipForm.value;

    const payload = {
      id: this.data?.pipDto?.pip?.id || null,
      employeeId: Number(val.employeeId),
      reason: val.reason,
      durationDays: Number(val.durationDays),
      startDate: new Date(val.startDate).toISOString(),
      checkInFrequency: val.checkInFrequency,
      outcome: val.outcome,
      finalComments: val.finalComments,
      status: val.status,
      objectivesJson: JSON.stringify(val.objectives)
    };

    this.pmsService.savePip(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Performance Improvement Plan saved successfully');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to save PIP');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
