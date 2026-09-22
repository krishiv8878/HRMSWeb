import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface TimesheetSubmitModalData {
  periodType: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  attendanceHours?: number;
  managerName?: string;
  isShiftInProgress?: boolean;
  activeShiftDate?: string;
}

@Component({
  selector: 'app-timesheet-submit-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './timesheet-submit-modal.component.html',
  styleUrl: './timesheet-submit-modal.component.scss'
})
export class TimesheetSubmitModalComponent {
  constructor(
    public dialogRef: MatDialogRef<TimesheetSubmitModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TimesheetSubmitModalData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
