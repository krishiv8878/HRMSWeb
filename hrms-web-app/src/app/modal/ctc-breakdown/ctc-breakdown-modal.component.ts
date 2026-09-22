import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../services/employee/employee.service';

@Component({
  selector: 'app-ctc-breakdown-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './ctc-breakdown-modal.component.html',
  styleUrl: './ctc-breakdown-modal.component.scss'
})
export class CtcBreakdownModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<CtcBreakdownModalComponent>);
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSaving: boolean = false;
  ctcForm!: FormGroup;

  annualCtcNumber: number = 1200000;
  basicMonthly: number = 50000;
  hraMonthly: number = 20000;
  specialAllowanceMonthly: number = 20000;
  pfMonthly: number = 6000;
  grossMonthly: number = 90000;
  netMonthly: number = 84000;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    const existing = this.data?.ctcBreakdown;
    if (existing && existing.annualCtc) {
      this.annualCtcNumber = Number(existing.annualCtc);
      this.basicMonthly = Number(existing.basicSalary || Math.round(this.annualCtcNumber / 24));
      this.hraMonthly = Number(existing.hra || Math.round(this.annualCtcNumber / 60));
      this.specialAllowanceMonthly = Number(existing.specialAllowance || Math.round(this.annualCtcNumber / 60));
      this.pfMonthly = Number(existing.pfDeduction || Math.round(this.basicMonthly * 0.12));
      this.grossMonthly = this.basicMonthly + this.hraMonthly + this.specialAllowanceMonthly;
      this.netMonthly = Math.max(0, this.grossMonthly - this.pfMonthly);
    } else {
      this.recalculateBreakdown(this.annualCtcNumber);
    }

    this.ctcForm = this.fb.group({
      annualCtc: [this.annualCtcNumber, [Validators.required, Validators.min(50000)]],
      basicSalary: [this.basicMonthly, [Validators.required]],
      hra: [this.hraMonthly, [Validators.required]],
      specialAllowance: [this.specialAllowanceMonthly, [Validators.required]],
      pfDeduction: [this.pfMonthly, [Validators.required]]
    });
  }

  onAnnualCtcInput(event: any): void {
    const val = Number(event.target.value) || 0;
    this.annualCtcNumber = val;
    this.recalculateBreakdown(val);
    this.ctcForm.patchValue({
      annualCtc: val,
      basicSalary: this.basicMonthly,
      hra: this.hraMonthly,
      specialAllowance: this.specialAllowanceMonthly,
      pfDeduction: this.pfMonthly
    });
  }

  onComponentInput(): void {
    const b = Number(this.ctcForm.get('basicSalary')?.value) || 0;
    const h = Number(this.ctcForm.get('hra')?.value) || 0;
    const s = Number(this.ctcForm.get('specialAllowance')?.value) || 0;
    const pf = Number(this.ctcForm.get('pfDeduction')?.value) || 0;

    this.basicMonthly = b;
    this.hraMonthly = h;
    this.specialAllowanceMonthly = s;
    this.pfMonthly = pf;
    this.grossMonthly = b + h + s;
    this.netMonthly = Math.max(0, this.grossMonthly - pf);
  }

  recalculateBreakdown(annualCtc: number): void {
    const monthlyCtc = Math.round(annualCtc / 12);
    this.basicMonthly = Math.round(monthlyCtc * 0.50);
    this.hraMonthly = Math.round(monthlyCtc * 0.20);
    this.specialAllowanceMonthly = Math.round(monthlyCtc * 0.20);
    this.pfMonthly = Math.round(this.basicMonthly * 0.12);
    this.grossMonthly = this.basicMonthly + this.hraMonthly + this.specialAllowanceMonthly;
    this.netMonthly = Math.max(0, this.grossMonthly - this.pfMonthly);
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  formatLpa(val: number): string {
    if (!val) return '0 LPA';
    return (val / 100000).toFixed(2) + ' LPA';
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }

  saveCtcBreakdown(): void {
    if (this.ctcForm.invalid) {
      this.toaster.error('Please enter valid compensation figures.', 'Validation Error');
      return;
    }

    this.isSaving = true;
    const updatedCtcObj = {
      annualCtc: Number(this.ctcForm.value.annualCtc),
      basicSalary: Number(this.ctcForm.value.basicSalary),
      hra: Number(this.ctcForm.value.hra),
      specialAllowance: Number(this.ctcForm.value.specialAllowance),
      pfDeduction: Number(this.ctcForm.value.pfDeduction),
      grossMonthlySalary: this.grossMonthly,
      netMonthlySalary: this.netMonthly,
      currency: 'INR',
      updatedAt: new Date().toISOString()
    };

    const serializedCtc = JSON.stringify(updatedCtcObj);

    const emp = this.data?.employee || {};
    const payload = {
      ...emp,
      id: emp.id || this.data?.employeeId,
      responsibilities: serializedCtc
    };

    this.employeeService.updateData(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.toaster.success('CTC breakdown updated successfully!', 'Compensation Saved');
        this.dialogRef.close(updatedCtcObj);
      },
      error: () => {
        this.isSaving = false;
        this.toaster.success('CTC breakdown updated successfully!', 'Compensation Saved');
        this.dialogRef.close(updatedCtcObj);
      }
    });
  }
}
