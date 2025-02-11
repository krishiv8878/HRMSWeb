import { Component } from '@angular/core';
<<<<<<< HEAD
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-employee-attend',
  standalone: true,
  imports: [MatDialogModule,MatButtonModule],
=======

@Component({
  selector: 'app-employee-attend',
  standalone: true,
  imports: [],
>>>>>>> 4a122dd (create employeeattendance)
  templateUrl: './employee-attend.component.html',
  styleUrl: './employee-attend.component.scss'
})
export class EmployeeAttendComponent {
<<<<<<< HEAD
  constructor(private dialogRef: MatDialogRef<EmployeeAttendComponent>) { }

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
=======
>>>>>>> 4a122dd (create employeeattendance)

}
