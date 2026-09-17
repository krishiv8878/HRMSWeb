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

  constructor(
    public dialogRef: MatDialogRef<RequestsApprovalsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  confirmSend(): void {
    this.dialogRef.close({
      confirmed: true,
      rejectionReason: this.rejectionReason
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
