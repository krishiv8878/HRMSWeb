import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsGoalDto, PmsKeyResult, PmsService } from '../../../services/pms/pms.service';

@Component({
  selector: 'app-checkin-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './checkin-modal.component.html',
  styleUrls: ['./checkin-modal.component.scss']
})
export class CheckinModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<CheckinModalComponent>);
  public data: { goalDto: PmsGoalDto; selectedKeyResultId?: number } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  selectedKr?: PmsKeyResult;

  checkInForm: FormGroup = this.fb.group({
    keyResultId: [null],
    newValue: [0, [Validators.required, Validators.min(0)]],
    confidenceScore: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
    notes: ['', [Validators.required, Validators.maxLength(500)]]
  });

  confidenceLevels = [
    { score: 1, label: 'Critical / Off Track', color: '#ef4444' },
    { score: 2, label: 'Behind Schedule', color: '#f97316' },
    { score: 3, label: 'At Risk', color: '#eab308' },
    { score: 4, label: 'On Track', color: '#10b981' },
    { score: 5, label: 'High Confidence / Ahead', color: '#6366f1' }
  ];

  ngOnInit(): void {
    const krs = this.data?.goalDto?.keyResults || [];
    let initialKrId = this.data?.selectedKeyResultId || (krs.length > 0 ? krs[0].id : null);

    this.checkInForm.patchValue({
      keyResultId: initialKrId,
      confidenceScore: this.data?.goalDto?.goal?.confidenceScore || 4
    });

    this.updateSelectedKr(initialKrId);

    this.checkInForm.get('keyResultId')?.valueChanges.subscribe(krId => {
      this.updateSelectedKr(krId);
    });
  }

  updateSelectedKr(krId: any): void {
    const id = Number(krId);
    const krs = this.data?.goalDto?.keyResults || [];
    this.selectedKr = krs.find(k => k.id === id);
    if (this.selectedKr) {
      this.checkInForm.patchValue({ newValue: this.selectedKr.currentValue }, { emitEvent: false });
    }
  }

  setConfidence(score: number): void {
    this.checkInForm.patchValue({ confidenceScore: score });
  }

  onSubmit(): void {
    if (this.checkInForm.invalid) {
      this.checkInForm.markAllAsTouched();
      this.toaster.warning('Please enter the current value and check-in notes');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.checkInForm.value;

    const payload = {
      goalId: this.data.goalDto.goal.id,
      keyResultId: formVal.keyResultId ? Number(formVal.keyResultId) : null,
      newValue: Number(formVal.newValue),
      confidenceScore: Number(formVal.confidenceScore),
      notes: formVal.notes
    };

    this.pmsService.recordCheckIn(this.data.goalDto.goal.id, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Check-in recorded! Goal progress recalculated.');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to record check-in');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
