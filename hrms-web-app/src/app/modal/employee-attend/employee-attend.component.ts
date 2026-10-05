import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceStateService } from '../../services/attendance/attendance-state.service';

export interface EmployeeAttendDialogData {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'warn' | 'success';
  punchType?: 'clockIn' | 'clockOut';
  icon?: string;
  action?: (callback: (success: boolean, errorMsg?: string) => void) => void;
}

@Component({
  selector: 'app-employee-attend',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './employee-attend.component.html',
  styleUrl: './employee-attend.component.scss'
})
export class EmployeeAttendComponent {
  private attendanceStateService = inject(AttendanceStateService);

  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private dialogRef: MatDialogRef<EmployeeAttendComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeAttendDialogData
  ) {}

  get iconName(): string {
    if (this.data?.icon) return this.data.icon;
    if (this.data?.punchType === 'clockIn') return 'login';
    if (this.data?.punchType === 'clockOut') return 'logout';
    return 'help_outline';
  }

  get isPunchOut(): boolean {
    return this.data?.punchType === 'clockOut' || this.data?.confirmColor === 'warn';
  }

  onConfirm(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.dialogRef.disableClose = true;

    const handleCallback = (success: boolean, errorMsg?: string) => {
      if (success) {
        this.dialogRef.close('success');
      } else {
        this.isSubmitting = false;
        this.dialogRef.disableClose = false;
        this.errorMessage = errorMsg || 'Operation failed. Please try again.';
      }
    };

    if (this.data?.action) {
      this.data.action(handleCallback);
    } else if (this.data?.punchType === 'clockIn') {
      this.attendanceStateService.clockIn(handleCallback);
    } else if (this.data?.punchType === 'clockOut') {
      this.attendanceStateService.clockOut(handleCallback);
    } else {
      // Legacy caller fallback
      this.dialogRef.close('confirm');
    }
  }

  onCancel(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close('cancel');
  }
}