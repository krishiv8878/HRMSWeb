import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PayrollService, FullAndFinalSettlement } from '../../../services/payroll/payroll.service';
import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-fnf-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './fnf-modal.component.html',
  styleUrls: ['./fnf-modal.component.scss']
})
export class FnfModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<FnfModalComponent>);
  public data: { employeeId?: number } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private payrollService = inject(PayrollService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isCalculating = false;
  isSaving = false;
  employeesList: any[] = [];
  settlementResult: FullAndFinalSettlement | null = null;

  fnfForm: FormGroup = this.fb.group({
    employeeId: [this.data?.employeeId || '', [Validators.required]],
    relievingDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    noticePeriodDays: [30, [Validators.required, Validators.min(0)]],
    noticePeriodServedDays: [30, [Validators.required, Validators.min(0)]],
    pendingSalaryDays: [0, [Validators.required, Validators.min(0)]],
    otherAllowances: [0],
    otherDeductions: [0],
    remarks: ['']
  });

  ngOnInit() {
    this.employeeService.getData().subscribe((res: any) => {
      this.employeesList = Array.isArray(res) ? res : (res?.data || res?.result || []);
      if (this.data?.employeeId) {
        this.fnfForm.patchValue({ employeeId: this.data.employeeId });
        this.calculate();
      }
    });
  }

  calculate() {
    if (this.fnfForm.invalid) {
      this.fnfForm.markAllAsTouched();
      return;
    }

    this.isCalculating = true;
    const formVal = this.fnfForm.value;

    this.payrollService.calculateFnF({
      employeeId: Number(formVal.employeeId),
      relievingDate: formVal.relievingDate,
      noticePeriodDays: Number(formVal.noticePeriodDays),
      noticePeriodServedDays: Number(formVal.noticePeriodServedDays),
      pendingSalaryDays: Number(formVal.pendingSalaryDays),
      otherAllowances: Number(formVal.otherAllowances || 0),
      otherDeductions: Number(formVal.otherDeductions || 0),
      remarks: formVal.remarks
    }).subscribe({
      next: (res: any) => {
        this.isCalculating = false;
        this.settlementResult = res?.data || null;
        this.toaster.success('Full & Final settlement calculated', 'Calculation Ready');
      },
      error: () => {
        this.isCalculating = false;
        this.toaster.error('Failed to calculate FnF settlement', 'Error');
      }
    });
  }

  approveSettlement() {
    if (!this.settlementResult) return;
    this.isSaving = true;
    this.payrollService.updateFnFStatus(this.settlementResult.id, 'Approved').subscribe({
      next: () => {
        this.isSaving = false;
        this.toaster.success('FnF Settlement approved', 'Success');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.toaster.error('Failed to update FnF status', 'Error');
      }
    });
  }

  formatCurrency(val: number): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  close() {
    this.dialogRef.close(false);
  }
}
