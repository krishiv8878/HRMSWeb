import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { ExpenseCategory, ExpenseService } from '../../../services/expense/expense.service';

@Component({
  selector: 'app-expense-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './expense-category-modal.component.html',
  styleUrls: ['./expense-category-modal.component.scss']
})
export class ExpenseCategoryModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ExpenseCategoryModalComponent>);
  public data: { category?: ExpenseCategory } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;

  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    description: [''],
    policyLimitPerClaim: [5000, [Validators.required, Validators.min(0)]],
    policyMonthlyCap: [25000, [Validators.required, Validators.min(0)]],
    isReceiptRequired: [true],
    receiptRequiredThreshold: [500, [Validators.required, Validators.min(0)]],
    isMileageCategory: [false],
    mileageRatePerKm: [10, [Validators.min(0)]],
    glAccountCode: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    if (this.data.category) {
      this.isEditMode = true;
      this.categoryForm.patchValue(this.data.category);
    }
  }

  submit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.toaster.warning('Please complete the required category fields', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const val: Partial<ExpenseCategory> = {
      ...this.categoryForm.value,
      id: this.data.category ? this.data.category.id : undefined,
      policyLimitPerClaim: Number(this.categoryForm.value.policyLimitPerClaim),
      policyMonthlyCap: Number(this.categoryForm.value.policyMonthlyCap),
      receiptRequiredThreshold: Number(this.categoryForm.value.receiptRequiredThreshold),
      mileageRatePerKm: Number(this.categoryForm.value.mileageRatePerKm)
    };

    this.expenseService.saveCategory(val).subscribe({
      next: () => {
        this.toaster.success(`Expense category ${this.isEditMode ? 'updated' : 'created'} successfully`, 'Success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to save category', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
