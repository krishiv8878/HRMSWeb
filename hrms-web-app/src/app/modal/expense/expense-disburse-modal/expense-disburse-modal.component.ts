import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  DisburseExpenseRequest,
  ExpenseReportDetailDto,
  ExpenseService
} from '../../../services/expense/expense.service';

@Component({
  selector: 'app-expense-disburse-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './expense-disburse-modal.component.html',
  styleUrls: ['./expense-disburse-modal.component.scss']
})
export class ExpenseDisburseModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ExpenseDisburseModalComponent>);
  public data: { report: ExpenseReportDetailDto } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  report!: ExpenseReportDetailDto;

  disburseForm: FormGroup = this.fb.group({
    paymentMode: ['Bank Transfer', Validators.required],
    paymentReference: ['', Validators.required],
    syncWithPayroll: [true],
    notes: ['']
  });

  ngOnInit(): void {
    this.report = this.data.report;
  }

  submit(): void {
    if (this.disburseForm.invalid) {
      this.disburseForm.markAllAsTouched();
      this.toaster.warning('Please enter valid disbursement details', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: DisburseExpenseRequest = {
      reportId: this.report.id,
      paymentMode: this.disburseForm.value.paymentMode,
      paymentReference: this.disburseForm.value.paymentReference,
      syncWithPayroll: this.disburseForm.value.syncWithPayroll,
      notes: this.disburseForm.value.notes
    };

    this.expenseService.disburseExpense(req).subscribe({
      next: () => {
        this.toaster.success(
          `Expense report ${this.report.reportNumber} disbursed successfully!`,
          'Payment Recorded'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to disburse expense report', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
