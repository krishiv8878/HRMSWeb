import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsService } from '../../../services/pms/pms.service';

@Component({
  selector: 'app-cycle-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './cycle-modal.component.html',
  styleUrls: ['./cycle-modal.component.scss']
})
export class CycleModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<CycleModalComponent>);
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private toaster = inject(ToastrService);

  isSubmitting = false;

  cycleForm: FormGroup = this.fb.group({
    cycleName: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    period: ['Quarterly', [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    selfReviewDeadline: ['', [Validators.required]],
    managerReviewDeadline: ['', [Validators.required]]
  });

  periods = ['Quarterly', 'Half-Yearly', 'Annual', 'Probation 90-Day Review'];

  ngOnInit(): void {
    const today = new Date();
    const selfDeadline = new Date(Date.now() + 14 * 86400000);
    const mgrDeadline = new Date(Date.now() + 28 * 86400000);
    const endCycle = new Date(Date.now() + 45 * 86400000);

    this.cycleForm.patchValue({
      cycleName: `Performance Review Cycle - Q4 ${today.getFullYear()}`,
      description: 'Comprehensive annual & quarterly talent evaluation and growth appraisal cycle',
      startDate: today.toISOString().substring(0, 10),
      endDate: endCycle.toISOString().substring(0, 10),
      selfReviewDeadline: selfDeadline.toISOString().substring(0, 10),
      managerReviewDeadline: mgrDeadline.toISOString().substring(0, 10)
    });
  }

  onSubmit(): void {
    if (this.cycleForm.invalid) {
      this.cycleForm.markAllAsTouched();
      this.toaster.warning('Please complete all timeline and cycle details');
      return;
    }

    this.isSubmitting = true;
    const val = this.cycleForm.value;

    const payload = {
      cycleName: val.cycleName,
      description: val.description,
      period: val.period,
      startDate: new Date(val.startDate).toISOString(),
      endDate: new Date(val.endDate).toISOString(),
      selfReviewDeadline: new Date(val.selfReviewDeadline).toISOString(),
      managerReviewDeadline: new Date(val.managerReviewDeadline).toISOString()
    };

    this.pmsService.createReviewCycle(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Appraisal cycle launched successfully!');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to create review cycle');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
