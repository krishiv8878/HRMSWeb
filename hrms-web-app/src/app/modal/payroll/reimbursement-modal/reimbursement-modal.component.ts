import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PayrollService } from '../../../services/payroll/payroll.service';
import { EmployeeService } from '../../../services/employee/employee.service';
import { RbacService } from '../../../core/rbac.service';

@Component({
  selector: 'app-reimbursement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './reimbursement-modal.component.html',
  styleUrls: ['./reimbursement-modal.component.scss']
})
export class ReimbursementModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ReimbursementModalComponent>);
  public data: { employeeId?: number } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private payrollService = inject(PayrollService);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isAdminOrHr = false;
  allEmployees: any[] = [];
  currentEmpId: number = 0;

  categories = [
    'Fuel & Transport',
    'Internet & Telephone',
    'Meal & Food Coupons',
    'Medical Expenses',
    'Books & Periodicals',
    'Travel & Lodging',
    'Professional Development',
    'Other Allowance'
  ];

  claimForm: FormGroup = this.fb.group({
    employeeId: [null],
    category: [this.categories[0], [Validators.required]],
    amount: ['', [Validators.required, Validators.min(1)]],
    billDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    billNumber: [''],
    merchantName: [''],
    description: [''],
    receiptUrl: ['']
  });

  ngOnInit() {
    this.isAdminOrHr = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;

    if (this.isAdminOrHr) {
      this.claimForm.get('employeeId')?.setValidators([Validators.required]);
      this.claimForm.get('employeeId')?.updateValueAndValidity();

      this.employeeService.getData().subscribe((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
        this.allEmployees = list.filter((e: any) => e.isActive !== false && e.isActive !== 0 && e.isActive !== 'false');

        const defaultId = this.data?.employeeId || this.currentEmpId || (this.allEmployees[0]?.id ?? null);
        if (defaultId) {
          this.claimForm.patchValue({ employeeId: defaultId });
        }
      });
    } else {
      this.claimForm.patchValue({ employeeId: this.currentEmpId });
    }
  }

  submit() {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formVal = this.claimForm.value;
    const targetEmpId = Number(formVal.employeeId) || this.currentEmpId || 0;

    this.payrollService.submitReimbursement({
      employeeId: targetEmpId,
      category: formVal.category,
      amount: Number(formVal.amount),
      billDate: formVal.billDate,
      billNumber: formVal.billNumber,
      merchantName: formVal.merchantName,
      description: formVal.description,
      receiptUrl: formVal.receiptUrl
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toaster.success('Reimbursement claim submitted for review', 'Success');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
        this.toaster.error('Failed to submit reimbursement claim', 'Error');
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
