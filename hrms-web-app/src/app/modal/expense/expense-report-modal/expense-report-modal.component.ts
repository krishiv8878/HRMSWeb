import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  ExpenseCategory,
  ExpenseAdvanceDto,
  ExpenseReportDetailDto,
  ExpenseService,
  CreateExpenseReportRequest
} from '../../../services/expense/expense.service';

@Component({
  selector: 'app-expense-report-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss']
})
export class ExpenseReportModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ExpenseReportModalComponent>);
  public data: { report?: ExpenseReportDetailDto } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;
  categories: ExpenseCategory[] = [];
  availableAdvances: ExpenseAdvanceDto[] = [];

  reportForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    expenseAdvanceId: [null],
    items: this.fb.array([]),
    mileageItems: this.fb.array([])
  });

  get itemsArray(): FormArray {
    return this.reportForm.get('items') as FormArray;
  }

  get mileageArray(): FormArray {
    return this.reportForm.get('mileageItems') as FormArray;
  }

  ngOnInit(): void {
    this.isEditMode = !!this.data.report;
    this.loadCategories();
    this.loadAdvances();

    if (this.isEditMode && this.data.report) {
      this.populateForm(this.data.report);
    } else {
      // Add one default item
      this.addItem();
    }
  }

  loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (res) => {
        this.categories = res.filter((c) => c.isActive);
      },
      error: () => this.toaster.error('Failed to load expense categories', 'Error')
    });
  }

  loadAdvances(): void {
    this.expenseService.getMyAdvances().subscribe({
      next: (res) => {
        // Only show Disbursed or Approved advances
        this.availableAdvances = res.filter((a) => a.status === 'Disbursed' || a.status === 'Approved');
      },
      error: () => {}
    });
  }

  populateForm(report: ExpenseReportDetailDto): void {
    this.reportForm.patchValue({
      title: report.title,
      description: report.description,
      expenseAdvanceId: report.expenseAdvanceId
    });

    if (report.items && report.items.length > 0) {
      report.items.forEach((item) => {
        this.itemsArray.push(
          this.fb.group({
            expenseCategoryId: [item.expenseCategoryId, Validators.required],
            expenseDate: [item.expenseDate?.split('T')[0] || '', Validators.required],
            merchantName: [item.merchantName || ''],
            description: [item.description || ''],
            amount: [item.amount, [Validators.required, Validators.min(1)]],
            taxAmount: [item.taxAmount || 0, [Validators.min(0)]],
            receiptUrl: [item.receiptUrl || '']
          })
        );
      });
    }

    if (report.mileageItems && report.mileageItems.length > 0) {
      report.mileageItems.forEach((m) => {
        this.mileageArray.push(
          this.fb.group({
            vehicleType: [m.vehicleType, Validators.required],
            startLocation: [m.startLocation, Validators.required],
            endLocation: [m.endLocation, Validators.required],
            distanceKm: [m.distanceKm, [Validators.required, Validators.min(0.1)]],
            tripDate: [m.tripDate?.split('T')[0] || '', Validators.required],
            purpose: [m.purpose || '']
          })
        );
      });
    }
  }

  addItem(): void {
    const today = new Date().toISOString().split('T')[0];
    this.itemsArray.push(
      this.fb.group({
        expenseCategoryId: [this.categories.length > 0 ? this.categories[0].id : null, Validators.required],
        expenseDate: [today, Validators.required],
        merchantName: [''],
        description: [''],
        amount: [0, [Validators.required, Validators.min(1)]],
        taxAmount: [0, [Validators.min(0)]],
        receiptUrl: ['']
      })
    );
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  addMileageItem(): void {
    const today = new Date().toISOString().split('T')[0];
    this.mileageArray.push(
      this.fb.group({
        vehicleType: ['Four-Wheeler', Validators.required],
        startLocation: ['', Validators.required],
        endLocation: ['', Validators.required],
        distanceKm: [0, [Validators.required, Validators.min(0.1)]],
        tripDate: [today, Validators.required],
        purpose: ['']
      })
    );
  }

  removeMileageItem(index: number): void {
    this.mileageArray.removeAt(index);
  }

  // Mileage rate calculation helper
  getRatePerKm(vehicleType: string): number {
    if (vehicleType === 'Two-Wheeler') return 5;
    if (vehicleType === 'Four-Wheeler') return 12;
    return 10;
  }

  // Computed totals
  get totalItemsAmount(): number {
    return this.itemsArray.controls.reduce((sum, ctrl) => {
      const amt = Number(ctrl.get('amount')?.value || 0);
      const tax = Number(ctrl.get('taxAmount')?.value || 0);
      return sum + amt + tax;
    }, 0);
  }

  get totalMileageAmount(): number {
    return this.mileageArray.controls.reduce((sum, ctrl) => {
      const dist = Number(ctrl.get('distanceKm')?.value || 0);
      const vtype = ctrl.get('vehicleType')?.value || 'Four-Wheeler';
      return sum + dist * this.getRatePerKm(vtype);
    }, 0);
  }

  get grossTotalClaim(): number {
    return this.totalItemsAmount + this.totalMileageAmount;
  }

  get selectedAdvanceAmount(): number {
    const advId = this.reportForm.get('expenseAdvanceId')?.value;
    if (!advId) return 0;
    const found = this.availableAdvances.find((a) => a.id === Number(advId));
    return found ? (found.disbursedAmount || found.requestedAmount) : 0;
  }

  get netPayable(): number {
    const diff = this.grossTotalClaim - this.selectedAdvanceAmount;
    return diff > 0 ? diff : 0;
  }

  submit(submitDirectly: boolean = false): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      this.toaster.warning('Please fill in all mandatory fields', 'Validation');
      return;
    }

    if (this.itemsArray.length === 0 && this.mileageArray.length === 0) {
      this.toaster.warning('Please add at least one expense or mileage item', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: CreateExpenseReportRequest = {
      title: this.reportForm.value.title,
      description: this.reportForm.value.description,
      expenseAdvanceId: this.reportForm.value.expenseAdvanceId ? Number(this.reportForm.value.expenseAdvanceId) : undefined,
      items: this.itemsArray.value.map((i: any) => ({
        expenseCategoryId: Number(i.expenseCategoryId),
        expenseDate: i.expenseDate,
        merchantName: i.merchantName,
        description: i.description,
        amount: Number(i.amount),
        taxAmount: Number(i.taxAmount || 0),
        receiptUrl: i.receiptUrl
      })),
      mileageItems: this.mileageArray.value.map((m: any) => ({
        vehicleType: m.vehicleType,
        startLocation: m.startLocation,
        endLocation: m.endLocation,
        distanceKm: Number(m.distanceKm),
        tripDate: m.tripDate,
        purpose: m.purpose
      }))
    };

    if (this.isEditMode && this.data.report) {
      this.expenseService.updateReport(this.data.report.id, req).subscribe({
        next: (saved) => {
          if (submitDirectly) {
            this.expenseService.submitReport(saved.id).subscribe({
              next: () => {
                this.toaster.success('Expense report submitted for manager approval', 'Success');
                this.dialogRef.close(true);
              },
              error: (err) => {
                this.toaster.error(err.error?.message || 'Failed to submit report', 'Error');
                this.isSubmitting = false;
              }
            });
          } else {
            this.toaster.success('Expense report draft updated', 'Success');
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Failed to update report', 'Error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.expenseService.createReport(req).subscribe({
        next: (created) => {
          if (submitDirectly) {
            this.expenseService.submitReport(created.id).subscribe({
              next: () => {
                this.toaster.success('Expense report created & submitted for approval', 'Success');
                this.dialogRef.close(true);
              },
              error: (err) => {
                this.toaster.error(err.error?.message || 'Failed to submit report', 'Error');
                this.isSubmitting = false;
              }
            });
          } else {
            this.toaster.success('Expense report saved as Draft', 'Success');
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Failed to create report', 'Error');
          this.isSubmitting = false;
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
