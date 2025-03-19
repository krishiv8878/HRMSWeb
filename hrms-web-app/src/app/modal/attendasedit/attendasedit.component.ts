import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
@Component({
  selector: 'app-attendasedit',
  standalone: true,
  imports: [MatInputModule, MatButtonModule, MatDividerModule, ReactiveFormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatRadioModule, CommonModule],
  templateUrl: './attendasedit.component.html',
  styleUrl: './attendasedit.component.scss'
})
export class AttendaseditComponent {
  services = inject(EmployeeeService)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  logs: { inTime: string; outTime: string }[] = [];

  attendaseform = this.formbuilder.group({
    selectedDate: [{ value: new Date(), disabled: true }],
    note: ['', Validators.required],
    inTime: ['', Validators.required],
    outTime: ['', Validators.required]
  })

  constructor(private dialogref: MatDialogRef<AttendaseditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  addLog() {
    if (this.data) {    
      this.logs.push({
        inTime: this.data.clockIn,        
        outTime: this.data.clockOut,
      })
    }
    // this.logs.push({ inTime: '', outTime: '' });
  }
  removeLog(index: number) {
    this.logs.splice(index);
  }


  submitdata() {
    if (this.attendaseform.valid) {
      console.log('Form Data:', this.attendaseform.value);
      this.dialogref.close(this.attendaseform.value);
    }
  }
  closeDialog() {
    this.dialogref.close();
  }
}
