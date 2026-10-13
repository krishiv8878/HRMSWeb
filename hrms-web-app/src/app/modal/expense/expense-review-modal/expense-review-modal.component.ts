import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  ApproveExpenseRequest,
  ExpenseReportDetailDto,
  ExpenseService
} from '../../../services/expense/expense.service';

@Component({
  selector: 'app-expense-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './expense-review-modal.component.html',
  styleUrls: ['./expense-review-modal.component.scss']
})
export class ExpenseReviewModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ExpenseReviewModalComponent>);
  public data: { report: ExpenseReportDetailDto; stage: 'Manager' | 'Finance' } = inject(MAT_DIALOG_DATA);
  private expenseService = inject(ExpenseService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  overallRemarks: string = '';
  report!: ExpenseReportDetailDto;
  stage: 'Manager' | 'Finance' = 'Manager';

  // Individual item approval states
  itemDecisions: { [itemId: number]: { isApproved: boolean; remarks: string } } = {};

  ngOnInit(): void {
    this.report = this.data.report;
    this.stage = this.data.stage || 'Manager';

    if (this.report?.items) {
      this.report.items.forEach((item) => {
        this.itemDecisions[item.id] = {
          isApproved: item.status !== 'Rejected',
          remarks: item.reviewerRemarks || ''
        };
      });
    }
  }

  isItemApproved(itemId: number): boolean {
    return this.itemDecisions[itemId] ? this.itemDecisions[itemId].isApproved : true;
  }

  toggleItemApproval(itemId: number): void {
    if (this.itemDecisions[itemId]) {
      this.itemDecisions[itemId].isApproved = !this.itemDecisions[itemId].isApproved;
    }
  }

  submitDecision(isApproved: boolean): void {
    if (!isApproved && !this.overallRemarks.trim()) {
      this.toaster.warning('Please enter reviewer remarks explaining rejection reason', 'Validation');
      return;
    }

    this.isSubmitting = true;

    const lineDecisions = Object.keys(this.itemDecisions).map((id) => ({
      itemId: Number(id),
      isApproved: this.itemDecisions[Number(id)].isApproved,
      remarks: this.itemDecisions[Number(id)].remarks
    }));

    const req: ApproveExpenseRequest = {
      reportId: this.report.id,
      stage: this.stage,
      isApproved,
      remarks: this.overallRemarks,
      itemDecisions: lineDecisions
    };

    this.expenseService.processApproval(req).subscribe({
      next: () => {
        this.toaster.success(
          `Expense report ${isApproved ? 'approved' : 'rejected'} successfully for ${this.stage} review`,
          'Success'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to submit review decision', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
