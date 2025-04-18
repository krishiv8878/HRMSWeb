import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [MatDialogModule,MatButtonModule,MatIconModule,CommonModule],
  templateUrl: './delete-modal.component.html',
  styleUrl: './delete-modal.component.scss'
})
export class DeleteModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  confirmDelete(): void {
    this.dialogRef.close(true); // user confirmed delete
  }

  cancel(): void {
    this.dialogRef.close(false); // user canceled
  }
}
