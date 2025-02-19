import { Component } from '@angular/core';
<<<<<<< HEAD
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
=======
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-employee-attend',
  standalone: true,
  imports: [MatDialogModule,MatButtonModule],
>>>>>>> a83d52e (edit employeemaping)
  templateUrl: './employee-attend.component.html',
  styleUrl: './employee-attend.component.scss'
})
export class EmployeeAttendComponent {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a83d52e (edit employeemaping)
  constructor(private dialogRef: MatDialogRef<EmployeeAttendComponent>) { }

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
<<<<<<< HEAD
=======
>>>>>>> 4a122dd (create employeeattendance)
=======
>>>>>>> a83d52e (edit employeemaping)

}
