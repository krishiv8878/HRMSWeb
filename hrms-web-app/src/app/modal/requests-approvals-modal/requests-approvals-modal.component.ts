import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-requests-approvals-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule, FormsModule],
  templateUrl: './requests-approvals-modal.component.html',
  styleUrl: './requests-approvals-modal.component.scss'
})
export class RequestsApprovalsModalComponent {
  rejectionReason: string = '';
  isSubmitting: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<RequestsApprovalsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  get clockInDisplay(): string | null {
    if (this.data?.inTimeText) return this.data.inTimeText;
    const val = this.data?.clockIn || this.data?.ClockIn || this.data?.clockInTime || this.data?.ClockInTime;
    if (!val) return null;
    return this.formatTime(val);
  }

  get clockOutDisplay(): string | null {
    if (this.data?.outTimeText) return this.data.outTimeText;
    const val = this.data?.clockOut || this.data?.ClockOut || this.data?.clockOutTime || this.data?.ClockOutTime;
    if (!val) return null;
    if (typeof val === 'string' && (val.startsWith('0001-01-01') || val.startsWith('1970-01-01'))) {
      return null;
    }
    return this.formatTime(val);
  }

  get totalRequestedHours(): string | null {
    if (this.data?.workingHoursText) return this.data.workingHoursText;
    const inVal = this.data?.clockIn || this.data?.ClockIn || this.data?.clockInTime || this.data?.ClockInTime;
    const outVal = this.data?.clockOut || this.data?.ClockOut || this.data?.clockOutTime || this.data?.ClockOutTime;
    if (!inVal || !outVal) return null;
    try {
      const dIn = new Date(inVal);
      const dOut = new Date(outVal);
      if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) return null;
      if (dOut <= dIn) return null;
      const diffMs = dOut.getTime() - dIn.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      const hrs = Math.floor(diffHrs);
      const mins = Math.round((diffHrs - hrs) * 60);
      if (mins === 0) return `${hrs} hrs`;
      return `${hrs}h ${mins}m`;
    } catch {
      return null;
    }
  }

  private formatTime(val: any): string | null {
    if (!val) return null;
    try {
      if (typeof val === 'string' && val.length === 5 && val.includes(':')) {
        const [h, m] = val.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m < 10 ? '0' : ''}${m} ${period}`;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      if (typeof val === 'string' && (val.startsWith('0001-01-01') || val.startsWith('1970-01-01'))) return null;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return String(val);
    }
  }

  confirmSend(): void {
    if (this.isSubmitting) return;
    if (this.data?.isReturn && (!this.rejectionReason || !this.rejectionReason.trim())) return;
    this.isSubmitting = true;
    this.dialogRef.close({
      confirmed: true,
      rejectionReason: this.rejectionReason
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
