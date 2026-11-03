import { Component, Inject, inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmailService } from '../../services/leaveRequest/email.service';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { RbacService } from '../../core/rbac.service';

export interface LeaveTypeItem {
  id: number;
  leaveTypeName: string;
  leaveName?: string;
  type?: string;
  allowedDays?: number;
  isPaid?: boolean;
  sandwichRuleEnabled?: boolean;
  maxSandwichLeavesAllowed?: number;
  isNegativeBalanceAllowed?: boolean;
  negativeBalanceLimit?: number;
}

@Component({
  selector: 'app-leaverequest',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDialogModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leaverequest.component.html',
  styleUrl: './leaverequest.component.scss'
})
export class LeaverequestComponent implements OnInit {
  private fb = inject(FormBuilder);
  private emailService = inject(EmailService);
  private leaveTypeService = inject(LeavetypeService);
  private holidayService = inject(HolidayservicesService);
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);

  holidays: any[] = [];

  isEdit = false;
  isSubmitting = false;
  leaveForm!: FormGroup;
  leaveTypes: LeaveTypeItem[] = [];
  selectedFileName: string | null = null;

  // Leave modes
  leaveModes: string[] = ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon'];

  // Leave balances (Dynamically fetched from API)
  leaveBalances: any[] = [];
  annualLeaveDays: number = 14;
  sickLeaveDays: number = 7;
  calculatedDays: number = 0;

  // Loss of Pay (LOP) & Policy tracking
  selectedLeaveRemaining: number | null = null;
  selectedLeaveQuota: number | null = null;
  selectedLeaveName: string = '';
  lopDays: number = 0;
  isFullLop: boolean = false;
  isLopMode: boolean = false;
  isSandwichActive: boolean = false;
  maxSandwichAllowed: number = 1;
  negativeBalanceAllowed: boolean = false;
  negativeBalanceLimit: number = 0;

  get availablePaidLimit(): number {
    if (this.selectedLeaveRemaining === null) return 0;
    return (this.selectedLeaveRemaining || 0) + (this.negativeBalanceAllowed ? this.negativeBalanceLimit : 0);
  }

  get hasBalanceShortfall(): boolean {
    if (this.isLopMode) return false;
    if (this.calculatedDays <= 0) return false;
    if (this.selectedLeaveRemaining === null) return false;
    return this.calculatedDays > this.availablePaidLimit;
  }

  get shortfallDays(): number {
    if (!this.hasBalanceShortfall) return 0;
    return Math.max(0, this.calculatedDays - this.availablePaidLimit);
  }

  get coveredPaidDays(): number {
    if (this.isLopMode) return 0;
    if (this.calculatedDays <= 0) return 0;
    return Math.max(0, Math.min(this.calculatedDays, this.availablePaidLimit));
  }

  setLopMode(mode: boolean) {
    this.isLopMode = mode;
    if (mode) {
      const lopType = this.leaveTypes.find(t => t.isPaid === false || 
        t.leaveTypeName.toLowerCase().includes('loss of pay') || 
        t.leaveTypeName.toLowerCase().includes('lop') ||
        t.leaveTypeName.toLowerCase().includes('unpaid'));
      if (lopType) {
        this.leaveForm.patchValue({ leaveTypeId: lopType.id }, { emitEvent: false });
      }
    } else {
      const currentSelected = this.leaveTypes.find(t => t.id === Number(this.leaveForm.get('leaveTypeId')?.value));
      if (!currentSelected || currentSelected.isPaid === false || 
          currentSelected.leaveTypeName.toLowerCase().includes('loss of pay') || 
          currentSelected.leaveTypeName.toLowerCase().includes('lop') ||
          currentSelected.leaveTypeName.toLowerCase().includes('unpaid')) {
        const paidType = this.leaveTypes.find(t => t.isPaid !== false && 
          !t.leaveTypeName.toLowerCase().includes('loss of pay') && 
          !t.leaveTypeName.toLowerCase().includes('lop') &&
          !t.leaveTypeName.toLowerCase().includes('unpaid'));
        if (paidType) {
          this.leaveForm.patchValue({ leaveTypeId: paidType.id }, { emitEvent: false });
        }
      }
    }
    this.updateCalculatedDays();
  }

  constructor(
    @Optional() private dialogRef?: MatDialogRef<LeaverequestComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadLeaveTypes();
    this.loadLeaveBalances();
    this.loadHolidays();

    this.leaveForm.get('leaveTypeId')?.valueChanges.subscribe((val) => {
      const selected = this.leaveTypes.find(t => t.id === Number(val));
      if (selected) {
        if (selected.isPaid === false || 
            selected.leaveTypeName.toLowerCase().includes('loss of pay') || 
            selected.leaveTypeName.toLowerCase().includes('lop') ||
            selected.leaveTypeName.toLowerCase().includes('unpaid')) {
          this.isLopMode = true;
        } else {
          this.isLopMode = false;
        }
      }
      this.updateCalculatedDays();
    });
    this.leaveForm.get('startDate')?.valueChanges.subscribe(() => this.updateCalculatedDays());
    this.leaveForm.get('endDate')?.valueChanges.subscribe(() => this.updateCalculatedDays());
    this.leaveForm.get('leaveMode')?.valueChanges.subscribe(() => this.updateCalculatedDays());
  }

  loadHolidays() {
    this.holidayService.getHoliday().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }
        this.holidays = list;
        this.updateCalculatedDays();
      },
      error: () => {
        this.holidays = [];
      }
    });
  }

  loadLeaveBalances() {
    const targetEmpId = this.data?.employeeId ? Number(this.data.employeeId) : undefined;
    this.emailService.getEmployeeLeaveBalance(targetEmpId).subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          this.leaveBalances = list;
          const annual = list.find(b => b.leaveTypeName?.toLowerCase().includes('annual') || b.leaveTypeName?.toLowerCase().includes('paid'));
          const sick = list.find(b => b.leaveTypeName?.toLowerCase().includes('sick') || b.leaveTypeName?.toLowerCase().includes('casual'));
          if (annual) this.annualLeaveDays = annual.remainingDays;
          if (sick) this.sickLeaveDays = sick.remainingDays;
          this.recalculateLop();
        }
      },
      error: (err) => {
        console.error('Error fetching dynamic leave balances:', err);
      }
    });
  }

  updateCalculatedDays() {
    const s = this.leaveForm.get('startDate')?.value;
    const e = this.leaveForm.get('endDate')?.value;
    const mode = this.leaveForm.get('leaveMode')?.value;

    if (!s || !e) {
      this.calculatedDays = 0;
      this.recalculateLop();
      return;
    }

    const start = new Date(s);
    const end = new Date(e);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      this.calculatedDays = 0;
      this.recalculateLop();
      return;
    }

    this.calculatedDays = this.emailService.calculateWorkingLeaveDays(start, end, mode, this.holidays);
    this.recalculateLop();
  }

  recalculateLop() {
    const selectedTypeId = Number(this.leaveForm.get('leaveTypeId')?.value);
    if (!selectedTypeId) {
      this.selectedLeaveRemaining = null;
      this.selectedLeaveQuota = null;
      this.selectedLeaveName = '';
      this.lopDays = 0;
      this.isFullLop = false;
      return;
    }

    const matchedBalance = this.leaveBalances.find(b => Number(b.leaveTypeId) === selectedTypeId);
    const matchedType = this.leaveTypes.find(t => t.id === selectedTypeId);

    if (matchedBalance) {
      this.selectedLeaveRemaining = Number(matchedBalance.availableDays !== undefined ? matchedBalance.availableDays : (matchedBalance.remainingDays ?? 0));
      this.selectedLeaveQuota = Number(matchedBalance.totalQuota ?? 0);
      this.selectedLeaveName = matchedBalance.leaveTypeName || '';
      this.isSandwichActive = Boolean(matchedBalance.sandwichRuleEnabled);
      this.maxSandwichAllowed = Number(matchedBalance.maxSandwichLeavesAllowed || 1);
      this.negativeBalanceAllowed = Boolean(matchedBalance.negativeBalanceAllowed);
      this.negativeBalanceLimit = Number(matchedBalance.negativeBalanceLimit || 0);
    } else if (matchedType) {
      this.selectedLeaveRemaining = Number(matchedType.allowedDays ?? 0);
      this.selectedLeaveQuota = Number(matchedType.allowedDays ?? 0);
      this.selectedLeaveName = matchedType.leaveTypeName;
      this.isSandwichActive = Boolean(matchedType.sandwichRuleEnabled);
      this.maxSandwichAllowed = Number(matchedType.maxSandwichLeavesAllowed || 1);
      this.negativeBalanceAllowed = Boolean(matchedType.isNegativeBalanceAllowed);
      this.negativeBalanceLimit = Number(matchedType.negativeBalanceLimit || 0);
    } else {
      this.selectedLeaveRemaining = null;
      this.selectedLeaveQuota = null;
      this.selectedLeaveName = '';
      this.isSandwichActive = false;
      this.negativeBalanceAllowed = false;
    }

    if (this.selectedLeaveQuota === 0 || (matchedType && matchedType.isPaid === false)) {
      this.isFullLop = true;
      this.isLopMode = true;
      this.lopDays = this.calculatedDays;
    } else if (this.selectedLeaveRemaining !== null) {
      this.isFullLop = false;
      this.lopDays = Math.max(0, this.calculatedDays - this.selectedLeaveRemaining);
    } else {
      this.isFullLop = false;
      this.lopDays = 0;
    }
  }

  private formatDateForInput(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return dateStr;
    }
  }

  private formatDateOnly(dateVal: any): string {
    if (!dateVal) return new Date().toISOString();
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toISOString();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}T12:00:00`;
  }

  private initForm() {
    this.leaveForm = this.fb.group({
      id: [0],
      leaveTypeId: [null, [Validators.required]],
      leaveMode: ['Full Day', [Validators.required]],
      status: ['Pending'],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      leaveReason: [''],
      isActive: [true],
      isDeleted: [false]
    });
  }

  loadLeaveTypes() {
    this.leaveTypeService.getAllData().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        }

        if (rawList.length > 0) {
          this.leaveTypes = rawList.map((item: any) => ({
            id: Number(item.id || item.leaveTypeId || 1),
            leaveTypeName: item.type || item.leaveTypeName || item.leaveName || 'Leave',
            allowedDays: item.allowedDays !== undefined && item.allowedDays !== null ? Number(item.allowedDays) : 0,
            isPaid: item.isPaid !== false,
            sandwichRuleEnabled: Boolean(item.sandwichRuleEnabled),
            maxSandwichLeavesAllowed: Number(item.maxSandwichLeavesAllowed || 1),
            isNegativeBalanceAllowed: Boolean(item.isNegativeBalanceAllowed),
            negativeBalanceLimit: Number(item.negativeBalanceLimit || 0)
          }));

          // Default selection if not already selected
          if (!this.leaveForm.get('leaveTypeId')?.value) {
            if (this.isLopMode) {
              const lopType = this.leaveTypes.find(t => t.isPaid === false || 
                t.leaveTypeName.toLowerCase().includes('loss of pay') || 
                t.leaveTypeName.toLowerCase().includes('lop') ||
                t.leaveTypeName.toLowerCase().includes('unpaid'));
              if (lopType) this.leaveForm.patchValue({ leaveTypeId: lopType.id }, { emitEvent: false });
            } else {
              const firstPaid = this.leaveTypes.find(t => t.isPaid !== false && 
                !t.leaveTypeName.toLowerCase().includes('loss of pay') && 
                !t.leaveTypeName.toLowerCase().includes('lop') &&
                !t.leaveTypeName.toLowerCase().includes('unpaid'));
              if (firstPaid) this.leaveForm.patchValue({ leaveTypeId: firstPaid.id }, { emitEvent: false });
            }
          }
          this.updateCalculatedDays();
        } else {
          this.leaveTypes = [];
        }
      },
      error: (err) => {
        console.error('Error loading leave types from API:', err);
        this.leaveTypes = [];
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      this.toastr.info(`Attached file: ${file.name}`);
    }
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  onSubmitRequest() {
    if (this.isSubmitting) return;

    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      this.toastr.warning('Please fill in all required leave details.');
      return;
    }

    if (this.calculatedDays <= 0) {
      this.toastr.warning('The selected date range falls entirely on weekends or company holidays (0 working days). Please choose valid working days.', 'Invalid Leave Dates');
      return;
    }

    this.isSubmitting = true;

    const formVal = this.leaveForm.getRawValue();
    let selectedLtId = Number(formVal.leaveTypeId);

    if (this.isLopMode) {
      const selectedLt = this.leaveTypes.find(t => t.id === selectedLtId);
      if (!selectedLt || selectedLt.isPaid !== false) {
        const lopType = this.leaveTypes.find(t => t.isPaid === false || 
          t.leaveTypeName.toLowerCase().includes('loss of pay') || 
          t.leaveTypeName.toLowerCase().includes('lop') ||
          t.leaveTypeName.toLowerCase().includes('unpaid'));
        if (lopType) {
          selectedLtId = lopType.id;
        }
      }
    }

    const loggedEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 1) : 1;
    let empId = loggedEmpId;
    if ((this.rbacService.isAdmin() || this.rbacService.isHR()) && this.data?.employeeId) {
      empId = Number(this.data.employeeId);
    }

    const isExplicitLop = this.isLopMode || (this.hasBalanceShortfall && this.coveredPaidDays === 0);
    const paidDays = isExplicitLop ? 0 : this.coveredPaidDays;
    const lopDays = isExplicitLop ? this.calculatedDays : this.shortfallDays;

    const payload = {
      id: 0,
      leaveRequestId: 0,
      employeeId: empId,
      leaveTypeId: selectedLtId || 1,
      leaveMode: formVal.leaveMode || 'Full Day',
      startDate: this.formatDateOnly(formVal.startDate),
      endDate: this.formatDateOnly(formVal.endDate),
      leaveReason: (formVal.leaveReason || '').trim(),
      status: 'Pending',
      actionBy: null,
      actionDate: null,
      rejectionReason: null,
      isActive: true,
      isDeleted: false,
      isLop: isExplicitLop,
      paidDays: paidDays,
      lopDays: lopDays,
      totalWorkingDays: this.calculatedDays
    };

    this.emailService.Leaverequest(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastr.success('Leave Request submitted successfully!', 'Success');
        this.dialogRef?.close(payload);
      },
      error: (err) => {
        console.error('Leaverequest submit error:', err);
        this.isSubmitting = false;
        this.toastr.error(err.error?.message || 'Failed to submit leave request. Please try again.', 'Submission Error');
      }
    });
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
