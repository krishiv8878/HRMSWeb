import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-timesheet-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './timesheet-review-modal.component.html',
  styleUrl: './timesheet-review-modal.component.scss'
})
export class TimesheetReviewModalComponent implements OnInit {
  rejectionReason: string = '';
  showRejectionForm: boolean = false;
  isSubmitting: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<TimesheetReviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    if (this.data?.initialAction === 'reject') {
      this.showRejectionForm = true;
    }
  }

  get isPending(): boolean {
    const s = (this.data?.status || '').toLowerCase();
    return !s || s === 'submitted' || s === 'pending';
  }

  get daysList(): any[] {
    return this.data?.days || this.data?.Days || [];
  }

  getTotalTasksCount(): number {
    return this.daysList.reduce((acc, day) => {
      const tasks = this.getDayTasks(day);
      return acc + tasks.length;
    }, 0);
  }

  getWorkingDaysCount(): number {
    return this.daysList.filter(day => {
      const hasTasks = this.getDayTasks(day).length > 0;
      const hasPunch = (day.attendanceHours || day.AttendanceHours || 0) > 0 || !!day.clockIn || !!day.ClockIn;
      return hasTasks || hasPunch;
    }).length;
  }

  getDayTasks(day: any): any[] {
    if (!day) return [];
    return day.tasks || day.Tasks || [];
  }

  getDayHours(day: any): number {
    const tasks = this.getDayTasks(day);
    if (tasks.length > 0) {
      return tasks.reduce((sum: number, t: any) => sum + Number(t.hours || t.Hours || 0), 0);
    }
    return Number(day.dayTotalHours || day.DayTotalHours || 0);
  }

  formatTime(val: any): string {
    if (!val) return '';
    try {
      if (typeof val === 'string' && (val.includes('AM') || val.includes('PM'))) {
        return val;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(val);
    }
  }

  formatDayHeader(dateVal: any, dayName?: string): string {
    if (!dateVal) return dayName || 'Day';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dayName || String(dateVal);
      return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dayName || String(dateVal);
    }
  }

  confirmApprove(): void {
    this.dialogRef.close({
      action: 'approve'
    });
  }

  openRejectForm(): void {
    this.showRejectionForm = true;
  }

  cancelReject(): void {
    this.showRejectionForm = false;
  }

  confirmReject(): void {
    this.dialogRef.close({
      action: 'reject',
      rejectionReason: this.rejectionReason.trim()
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
