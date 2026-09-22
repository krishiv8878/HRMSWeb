import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, catchError } from 'rxjs';

import { EmployeeService } from '../../services/employee/employee.service';
import {
  PayrollLopService,
  PayrollLopSettings,
  LopDetectionResult,
  LopDayDetail
} from '../../services/payroll/payroll-lop.service';
import { PayrollLopSettingsModalComponent } from '../payroll-lop-settings-modal/payroll-lop-settings-modal.component';
import { EmailService } from '../../services/leaveRequest/email.service';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';

export interface SalaryDisbursementRecord {
  id: string;
  monthYear: string;
  month?: string;
  creditDate: string;
  paymentDate?: string;
  paymentMode: string;
  transactionRef: string;
  grossSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  pfDeduction: number;
  additionalDeductions: number;
  deductionReason?: string;
  bonusAmount: number;
  netSalaryCredited: number;
  netSalary?: number;
  status: 'Credited' | 'Pending';
  markedBy: string;
  markedAt: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

@Component({
  selector: 'app-salary-credit-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './salary-credit-modal.component.html',
  styleUrl: './salary-credit-modal.component.scss'
})
export class SalaryCreditModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<SalaryCreditModalComponent>);
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private lopService = inject(PayrollLopService);
  private emailService = inject(EmailService);
  private attendanceService = inject(EmployeeeService);
  private holidayService = inject(HolidayservicesService);
  private attRequestService = inject(AttendanceRequestService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  creditForm!: FormGroup;
  isSubmitting: boolean = false;

  employee: any = null;
  bankInfo: any = null;
  selectedMonth: string = '';

  annualCtc: number = 0;
  grossMonthly: number = 0;
  basicSalary: number = 0;
  hra: number = 0;
  specialAllowance: number = 0;
  pfDeduction: number = 0;
  calculatedNet: number = 0;

  // LOP Calculation State
  lopSettings!: PayrollLopSettings;
  activeRuleLabel: string = '';
  lopDailyRate: number = 0;
  lopDaysCount: number = 0;
  detectedUnpaidLeaveDays: number = 0;
  detectedAbsentDays: number = 0;
  totalDetectedLopDays: number = 0;
  detectedDayDetails: LopDayDetail[] = [];
  detectedMonthDays: number = 30;
  detectedWorkingDays: number = 22;
  calculatedLopDeduction: number = 0;
  isLoadingLopData: boolean = false;
  isLopApplied: boolean = false;
  formulaBreakdownStr: string = '';

  paymentModes: string[] = [
    'Direct Bank Transfer (NEFT)',
    'Real Time Gross Settlement (RTGS)',
    'Immediate Payment Service (IMPS)',
    'Internal Bank Clearing',
    'Company Cheque'
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    this.employee = this.data?.employee || {};
    this.bankInfo = this.data?.bankInfo || null;
    this.selectedMonth = this.data?.selectedMonth || this.getDefaultCurrentMonth();

    this.extractCtcBreakdown();
    this.initForm();

    this.lopSettings = this.lopService.getSettings();
    this.activeRuleLabel = this.lopService.getRuleLabel(this.lopSettings);

    this.loadLopData();

    // Listen to changes in monthYear to auto-recalculate LOP
    this.creditForm.get('monthYear')?.valueChanges.subscribe(() => {
      this.loadLopData();
    });
  }

  private getDefaultCurrentMonth(): string {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  private extractCtcBreakdown(): void {
    const resp = this.employee?.responsibilities;
    if (resp && typeof resp === 'string' && resp.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(resp);
        this.annualCtc = Number(parsed.annualCtc || 0);
        this.basicSalary = Number(parsed.basicSalary || 0);
        this.hra = Number(parsed.hra || 0);
        this.specialAllowance = Number(parsed.specialAllowance || 0);
        this.pfDeduction = Number(parsed.pfDeduction || 0);
        this.grossMonthly = Number(parsed.grossMonthlySalary || (this.basicSalary + this.hra + this.specialAllowance));
        this.calculatedNet = Number(parsed.netMonthlySalary || Math.max(0, this.grossMonthly - this.pfDeduction));
        return;
      } catch {}
    }

    // Default fallback calculation if no structured CTC breakdown exists yet
    this.basicSalary = 50000;
    this.hra = 20000;
    this.specialAllowance = 20000;
    this.pfDeduction = 6000;
    this.grossMonthly = 90000;
    this.annualCtc = 1080000;
    this.calculatedNet = 84000;
  }

  private initForm(): void {
    const today = new Date().toISOString().slice(0, 10);
    const existingDisbursement: SalaryDisbursementRecord | undefined = this.data?.existingDisbursement;

    const defaultTxn = existingDisbursement?.transactionRef ||
      `TXN-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

    this.creditForm = this.fb.group({
      monthYear: [this.selectedMonth, [Validators.required]],
      creditDate: [existingDisbursement ? existingDisbursement.creditDate.slice(0, 10) : today, [Validators.required]],
      paymentMode: [existingDisbursement?.paymentMode || 'Direct Bank Transfer (NEFT)', [Validators.required]],
      transactionRef: [defaultTxn, [Validators.required]],
      grossSalary: [existingDisbursement?.grossSalary ?? this.grossMonthly, [Validators.required, Validators.min(0)]],
      additionalDeductions: [existingDisbursement?.additionalDeductions ?? 0, [Validators.min(0)]],
      deductionReason: [existingDisbursement?.deductionReason || ''],
      bonusAmount: [existingDisbursement?.bonusAmount ?? 0, [Validators.min(0)]],
      netSalaryCredited: [existingDisbursement?.netSalaryCredited ?? this.calculatedNet, [Validators.required, Validators.min(1)]]
    });

    this.recalculateNet();

    this.creditForm.get('additionalDeductions')?.valueChanges.subscribe((val) => {
      this.isLopApplied = Number(val) > 0 && Number(val) === this.calculatedLopDeduction;
      this.recalculateNet();
    });

    this.creditForm.get('bonusAmount')?.valueChanges.subscribe(() => this.recalculateNet());
  }

  recalculateNet(): void {
    const gross = Number(this.creditForm.get('grossSalary')?.value || this.grossMonthly);
    const pf = this.pfDeduction;
    const addlDed = Number(this.creditForm.get('additionalDeductions')?.value || 0);
    const bonus = Number(this.creditForm.get('bonusAmount')?.value || 0);

    const net = Math.max(0, gross - pf - addlDed + bonus);
    this.calculatedNet = net;
    this.creditForm.get('netSalaryCredited')?.setValue(net, { emitEvent: false });
  }

  // ================= SMART LOP CALCULATION ENGINE =================

  loadLopData(): void {
    this.isLoadingLopData = true;
    const targetMonthStr = this.creditForm?.get('monthYear')?.value || this.selectedMonth;

    forkJoin({
      leavesRes: this.emailService.getData().pipe(catchError(() => of<any>({ data: [] }))),
      holidaysRes: this.holidayService.getHoliday().pipe(catchError(() => of<any>([]))),
      attendanceRes: this.attendanceService.getAllData().pipe(catchError(() => of<any>([]))),
      logsRes: this.attendanceService.getAttendanceLogs().pipe(catchError(() => of<any>([]))),
      requestsRes: this.attRequestService.getAllData().pipe(catchError(() => of<any>([])))
    }).subscribe({
      next: ({ leavesRes, holidaysRes, attendanceRes, logsRes, requestsRes }: any) => {
        this.isLoadingLopData = false;

        const leaves = Array.isArray(leavesRes) ? leavesRes : (leavesRes?.data || []);
        const holidays = Array.isArray(holidaysRes) ? holidaysRes : (holidaysRes?.data || []);
        const attendances = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes?.data || []);
        const logs = Array.isArray(logsRes) ? logsRes : (logsRes?.data || []);
        const requests = Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || []);

        const result: LopDetectionResult = this.lopService.detectEmployeeLopDays(
          Number(this.employee?.id || 0),
          targetMonthStr,
          holidays,
          leaves,
          attendances,
          logs,
          requests
        );

        this.detectedUnpaidLeaveDays = result.unpaidLeaveDays;
        this.detectedAbsentDays = result.unexcusedAbsentDays;
        this.totalDetectedLopDays = result.totalLopDays;
        this.detectedDayDetails = result.dayDetails;
        this.detectedMonthDays = result.monthDays;
        this.detectedWorkingDays = result.workingDays;
        this.lopDaysCount = result.totalLopDays;

        this.recalculateLopRate();

        const currentDeduction = Number(this.creditForm.get('additionalDeductions')?.value || 0);
        if (currentDeduction > 0 && currentDeduction === this.calculatedLopDeduction) {
          this.isLopApplied = true;
        }
      },
      error: (err) => {
        this.isLoadingLopData = false;
        console.error('Error loading attendance & leave data for LOP calculation:', err);
        this.recalculateLopRate();
      }
    });
  }

  recalculateLopRate(): void {
    this.lopDailyRate = this.lopService.calculatePerDayRate(
      this.grossMonthly,
      this.basicSalary,
      this.annualCtc,
      this.detectedMonthDays,
      this.detectedWorkingDays,
      this.lopSettings
    );

    this.calculatedLopDeduction = this.lopService.calculateTotalDeduction(
      this.lopDaysCount,
      this.lopDailyRate
    );

    let baseText = `₹${this.grossMonthly.toLocaleString('en-IN')}`;
    if (this.lopSettings.calculationBase === 'basic_only') {
      baseText = `₹${this.basicSalary.toLocaleString('en-IN')}`;
    } else if (this.lopSettings.calculationBase === 'annual_ctc') {
      baseText = `₹${Math.round(this.annualCtc / 12).toLocaleString('en-IN')}`;
    }

    let divNum = 30;
    if (this.lopSettings.divisorBasis === 'fixed_26') divNum = 26;
    if (this.lopSettings.divisorBasis === 'working_days') divNum = this.detectedWorkingDays;
    if (this.lopSettings.divisorBasis === 'actual_days') divNum = this.detectedMonthDays;

    this.formulaBreakdownStr = `${baseText} ÷ ${divNum} Days = ₹${this.lopDailyRate.toLocaleString('en-IN')}/day`;
  }

  adjustLopDays(delta: number): void {
    this.lopDaysCount = Math.max(0, this.lopDaysCount + delta);
    this.calculatedLopDeduction = this.lopService.calculateTotalDeduction(
      this.lopDaysCount,
      this.lopDailyRate
    );

    if (this.isLopApplied) {
      this.applyCalculatedLop(false);
    }
  }

  applyCalculatedLop(showToast: boolean = true): void {
    this.creditForm.get('additionalDeductions')?.setValue(this.calculatedLopDeduction);

    let reasonParts: string[] = [];
    if (this.detectedUnpaidLeaveDays > 0) reasonParts.push(`${this.detectedUnpaidLeaveDays} Unpaid Leave`);
    if (this.detectedAbsentDays > 0) reasonParts.push(`${this.detectedAbsentDays} Absent`);

    const breakdownNote = reasonParts.length > 0 ? ` (${reasonParts.join(', ')})` : '';
    const formattedReason = `${this.lopDaysCount} LOP day${this.lopDaysCount === 1 ? '' : 's'}${breakdownNote} @ ₹${this.lopDailyRate.toLocaleString('en-IN')}/day`;

    this.creditForm.get('deductionReason')?.setValue(formattedReason);
    this.isLopApplied = true;
    this.recalculateNet();

    if (showToast) {
      this.toaster.success(
        `Applied LOP deduction of ₹${this.calculatedLopDeduction.toLocaleString('en-IN')} (${this.lopDaysCount} days @ ₹${this.lopDailyRate}/day)`,
        'LOP Applied'
      );
    }
  }

  clearLopDeduction(): void {
    this.creditForm.get('additionalDeductions')?.setValue(0);
    this.creditForm.get('deductionReason')?.setValue('');
    this.isLopApplied = false;
    this.recalculateNet();
  }

  openLopSettings(): void {
    const dialogRef = this.dialog.open(PayrollLopSettingsModalComponent, {
      width: '740px',
      maxHeight: '90vh',
      panelClass: 'custom-clean-dialog'
    });

    dialogRef.afterClosed().subscribe((newSettings?: PayrollLopSettings) => {
      if (newSettings) {
        this.lopSettings = newSettings;
        this.activeRuleLabel = this.lopService.getRuleLabel(this.lopSettings);
        this.recalculateLopRate();
        if (this.isLopApplied) {
          this.applyCalculatedLop(false);
        }
      }
    });
  }

  // ================= UTILITIES & SUBMISSION =================

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }

  submitSalaryCredit(): void {
    if (this.creditForm.invalid) {
      this.creditForm.markAllAsTouched();
      this.toaster.error('Please verify all salary credit fields.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.creditForm.value;

    const currentUserName = typeof window !== 'undefined'
      ? (localStorage.getItem('fullName') || localStorage.getItem('userName') || 'HR Operations')
      : 'HR Operations';

    const newRecord: SalaryDisbursementRecord = {
      id: `DISB-${formVal.monthYear.replace(/\s+/g, '-')}-${this.employee.id}`,
      monthYear: formVal.monthYear,
      month: formVal.monthYear,
      creditDate: new Date(formVal.creditDate).toISOString(),
      paymentDate: formVal.creditDate,
      paymentMode: formVal.paymentMode,
      transactionRef: formVal.transactionRef.trim(),
      grossSalary: Number(formVal.grossSalary),
      basicSalary: this.basicSalary,
      hra: this.hra,
      specialAllowance: this.specialAllowance,
      pfDeduction: this.pfDeduction,
      additionalDeductions: Number(formVal.additionalDeductions || 0),
      deductionReason: (formVal.deductionReason || '').trim(),
      bonusAmount: Number(formVal.bonusAmount || 0),
      netSalaryCredited: Number(formVal.netSalaryCredited),
      netSalary: Number(formVal.netSalaryCredited),
      status: 'Credited',
      markedBy: currentUserName,
      markedAt: new Date().toISOString(),
      bankName: this.bankInfo?.bankName || 'Direct Deposit',
      accountNumber: this.bankInfo?.accountNumber ? String(this.bankInfo.accountNumber) : '—',
      ifscCode: this.bankInfo?.ifscCode || '—'
    };

    // Load or parse existing responsibilities JSON from employee
    let currentPayload: any = {};
    if (this.employee.responsibilities && typeof this.employee.responsibilities === 'string' && this.employee.responsibilities.trim().startsWith('{')) {
      try {
        currentPayload = JSON.parse(this.employee.responsibilities);
      } catch {
        currentPayload = {};
      }
    }

    const existingDisbursements: SalaryDisbursementRecord[] = Array.isArray(currentPayload.disbursements)
      ? currentPayload.disbursements
      : [];

    // Filter out existing record for the same monthYear if re-crediting
    const updatedDisbursements = [
      ...existingDisbursements.filter(d => d.monthYear.toLowerCase() !== formVal.monthYear.toLowerCase()),
      newRecord
    ];

    currentPayload.disbursements = updatedDisbursements;
    currentPayload.lastDisbursedMonth = formVal.monthYear;
    currentPayload.lastDisbursedDate = newRecord.creditDate;

    const updatedEmployee = {
      ...this.employee,
      responsibilities: JSON.stringify(currentPayload)
    };

    this.employeeService.updateData(updatedEmployee).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toaster.success(
          `Salary for ${this.employee.firstName} ${this.employee.lastName} marked as Credited for ${formVal.monthYear}!`,
          'Salary Credited'
        );
        this.dialogRef.close({ updated: true, disbursement: newRecord });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error updating salary disbursement:', err);
        this.toaster.error('Failed to save salary credit record.', 'Update Error');
      }
    });
  }
}
