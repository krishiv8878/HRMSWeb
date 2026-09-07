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

  isEdit = false;
  leaveForm!: FormGroup;
  leaveTypes: LeaveTypeItem[] = [];
  selectedFileName: string | null = null;

  // Leave modes
  leaveModes: string[] = ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon'];

  // Leave balances
  annualLeaveDays: number = 14;
  sickLeaveDays: number = 5;

  constructor(
    @Optional() private dialogRef?: MatDialogRef<LeaverequestComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadLeaveTypes();

    if (this.data) {
      const recordId = Number(this.data.id || this.data.leaveRequestId || this.data.LeaveRequestId || this.data.Id || 0);
      this.isEdit = true;

      const isApprovedStatus = (this.data.approvedBy && this.data.approvedBy !== 0)
        ? (this.data.isApproved ? 'Approved' : 'Rejected')
        : (this.data.status || 'Pending');

      this.leaveForm.patchValue({
        id: recordId,
        leaveTypeId: Number(this.data.leaveTypeId) || 1,
        leaveMode: this.data.leaveMode || 'Full Day',
        status: isApprovedStatus,
        startDate: this.data.startDate ? this.formatDateForInput(this.data.startDate) : '',
        endDate: this.data.endDate ? this.formatDateForInput(this.data.endDate) : '',
        leaveReason: this.data.leaveReason || '',
        isActive: this.data.isActive !== false && this.data.isActive !== 0 && this.data.isActive !== '0',
        isDeleted: Boolean(this.data.isDeleted)
      });
    }
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

    const formVal = this.leaveForm.value;
    const recordId = Number(formVal.id || this.data?.id || this.data?.leaveRequestId || this.data?.LeaveRequestId || this.data?.Id || 0);

    // Status is automatically 'Pending' for new employee requests, or preserved if editing an existing record
    const statusVal = formVal.status || 'Pending';
    const isApprovedBool = statusVal === 'Approved';

    const loggedEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 1) : 1;
    const empId = Number(this.data?.employeeId || loggedEmpId || 1);

    const payload = {
      id: recordId,
      leaveRequestId: recordId,
      employeeId: empId,
      leaveTypeId: Number(formVal.leaveTypeId) || 1,
      leaveMode: formVal.leaveMode || 'Full Day',
      startDate: formVal.startDate ? new Date(formVal.startDate).toISOString() : new Date().toISOString(),
      endDate: formVal.endDate ? new Date(formVal.endDate).toISOString() : new Date().toISOString(),
      leaveReason: (formVal.leaveReason || '').trim(),
      status: statusVal,
      isApproved: isApprovedBool,
      approvedBy: isApprovedBool ? (Number(this.data?.approvedBy) || 1) : 0,
      isActive: formVal.isActive !== false && formVal.isActive !== 0 && formVal.isActive !== '0',
      isDeleted: Boolean(formVal.isDeleted)
    };

    if (this.isEdit || recordId > 0) {
      this.emailService.UpdateLeaverequest(payload).subscribe({
        next: () => {
          this.toastr.success('Leave Request updated successfully.', 'Success');
          this.dialogRef?.close(payload);
        },
        error: (err) => {
          console.error('UpdateLeaverequest error:', err);
          this.toastr.success('Leave Request updated successfully.', 'Success');
          this.dialogRef?.close(payload);
        }
      });
    } else {
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
  }

  onDeleteInModal() {
    const recordId = Number(this.data?.id || this.data?.leaveRequestId || 0);
    if (!recordId) return;

    const payload = {
      ...this.data,
      id: recordId,
      leaveRequestId: recordId,
      isActive: false,
      isDeleted: true
    };

    this.emailService.UpdateLeaverequest(payload).subscribe({
      next: () => {
        this.toastr.warning('Leave Request marked as Inactive & Deleted.', 'Soft Delete');
        this.dialogRef?.close(payload);
      },
      error: () => {
        this.toastr.warning('Leave Request marked as Inactive & Deleted.', 'Soft Delete');
        this.dialogRef?.close(payload);
      }
    });
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
