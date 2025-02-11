import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-employee-attend',
  standalone: true,
  imports: [MatDialogModule,MatButtonModule],
  templateUrl: './employee-attend.component.html',
  styleUrl: './employee-attend.component.scss'
})
export class EmployeeAttendComponent {
  constructor(private dialogRef: MatDialogRef<EmployeeAttendComponent>) { }

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
