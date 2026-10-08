import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { ExpenseService, RequestAdvanceDto } from '../../../services/expense/expense.service';

@Component({
  selector: 'app-expense-advance-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './expense-advance-modal.component.html',
  styleUrls: ['./expense-advance-modal.component.scss']
})
export class ExpenseAdvanceModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ExpenseAdvanceModalComponent>);
  public data: any = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private toaster = inject(ToastrService);

  isSubmitting = false;

  advanceForm: FormGroup = this.fb.group({
    requestedAmount: [null, [Validators.required, Validators.min(100)]],
    reason: ['', [Validators.required, Validators.maxLength(250)]],
    expectedTravelStartDate: ['', Validators.required],
    expectedTravelEndDate: ['']
  });

  ngOnInit(): void {}

  submit(): void {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      this.toaster.warning('Please enter valid advance details', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: RequestAdvanceDto = {
      requestedAmount: Number(this.advanceForm.value.requestedAmount),
      reason: this.advanceForm.value.reason,
      expectedTravelStartDate: this.advanceForm.value.expectedTravelStartDate || undefined,
      expectedTravelEndDate: this.advanceForm.value.expectedTravelEndDate || undefined
    };

    this.expenseService.requestAdvance(req).subscribe({
      next: () => {
        this.toaster.success('Travel cash advance requested successfully', 'Success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to request advance', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
