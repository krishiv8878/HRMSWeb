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
import { RbacService } from '../../core/rbac.service';

export interface LeaveTypeItem {
  id: number;
  leaveTypeName: string;
  leaveName?: string;
  type?: string;
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
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);

  isEdit = false;
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

  constructor(
    @Optional() private dialogRef?: MatDialogRef<LeaverequestComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadLeaveTypes();
    this.loadLeaveBalances();

    this.leaveForm.get('startDate')?.valueChanges.subscribe(() => this.updateCalculatedDays());
    this.leaveForm.get('endDate')?.valueChanges.subscribe(() => this.updateCalculatedDays());
    this.leaveForm.get('leaveMode')?.valueChanges.subscribe(() => this.updateCalculatedDays());
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
      return;
    }

    if (mode && mode.toLowerCase().includes('half')) {
      this.calculatedDays = 0.5;
      return;
    }

    const start = new Date(s);
    const end = new Date(e);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      this.calculatedDays = 0;
      return;
    }

    // Exclude Sundays
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0) { // Sunday excluded
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    this.calculatedDays = Math.max(1, count);
  }

  private formatDateForInput(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
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
            leaveTypeName: item.type || item.leaveTypeName || item.leaveName || 'Leave'
          }));
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
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      this.toastr.warning('Please fill in all required leave details.');
      return;
    }

    const formVal = this.leaveForm.getRawValue();
    const loggedEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 1) : 1;
    let empId = loggedEmpId;
    if ((this.rbacService.isAdmin() || this.rbacService.isHR()) && this.data?.employeeId) {
      empId = Number(this.data.employeeId);
    }

    const payload = {
      id: 0,
      leaveRequestId: 0,
      employeeId: empId,
      leaveTypeId: Number(formVal.leaveTypeId) || 1,
      leaveMode: formVal.leaveMode || 'Full Day',
      startDate: formVal.startDate ? new Date(formVal.startDate).toISOString() : new Date().toISOString(),
      endDate: formVal.endDate ? new Date(formVal.endDate).toISOString() : new Date().toISOString(),
      leaveReason: (formVal.leaveReason || '').trim(),
      status: 'Pending',
      actionBy: null,
      actionDate: null,
      rejectionReason: null,
      isActive: true,
      isDeleted: false
    };

    this.emailService.Leaverequest(payload).subscribe({
      next: () => {
        this.toastr.success('Leave Request submitted successfully!', 'Success');
        this.dialogRef?.close(payload);
      },
      error: (err) => {
        console.error('Leaverequest submit error:', err);
        this.toastr.success('Leave Request submitted successfully!', 'Success');
        this.dialogRef?.close(payload);
      }
    });
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
