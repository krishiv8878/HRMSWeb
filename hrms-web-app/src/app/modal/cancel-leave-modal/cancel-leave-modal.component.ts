import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface CancelLeaveModalData {
  leaveId: number;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

@Component({
  selector: 'app-cancel-leave-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './cancel-leave-modal.component.html',
  styleUrl: './cancel-leave-modal.component.scss'
})
export class CancelLeaveModalComponent {
  cancellationReason: string = '';

  constructor(
    public dialogRef: MatDialogRef<CancelLeaveModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelLeaveModalData
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close({
      confirmed: true,
      reason: this.cancellationReason.trim() || 'Cancelled by employee'
    });
  }
}
