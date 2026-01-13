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
  imports: [MatInputModule, MatButtonModule,MatFormField, MatDividerModule, ReactiveFormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatRadioModule, CommonModule],
  templateUrl: './attendasedit.component.html',
  styleUrl: './attendasedit.component.scss'
})
export class AttendaseditComponent {
  services = inject(EmployeeeService)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  logs: { clockIn: string; clockOut: string }[] = [];

  attendaseform = this.formbuilder.group({
    RequestType: ['Regularization', Validators.required],
    selectedDate: [{ value: new Date(), disabled: true }],
    Reason: ['', Validators.required],
    clockIn: [''],
    clockOut: ['']
  })

  constructor(private dialogref: MatDialogRef<AttendaseditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    console.log("Received Date:", this.data?.Date);

    if (this.data?.Date) {
      const parts = this.data.Date.split(" "); 

      const day = parseInt(parts[1], 10);
      const monthStr = parts[2];
      const year = new Date().getFullYear();

      const monthMap = {Jan: 0,Feb: 1,Mar: 2,Apr: 3,May: 4,Jun: 5,Jul: 6,Aug: 7,Sep: 8,Oct: 9,Nov: 10,Dec: 11};

      const month = monthMap[monthStr as keyof typeof monthMap];
      console.log("Parsed Date Components:", { month, day, year });

      const receivedDate = new Date(year, month, day,12);
      console.log("Parsed Date:", receivedDate);

      if (!isNaN(receivedDate.getTime())) {
        receivedDate.setFullYear(new Date().getFullYear());

        console.log("Updated Date with Current Year:", receivedDate);

        this.attendaseform.patchValue({
          selectedDate: receivedDate,
          clockIn: this.data.clockIn,
          clockOut: this.data.clockOut,
        });
      }
    }
  }

  addLog() {
    if (this.data) {
      this.logs.push({
        clockIn: this.data.clockIn,
        clockOut: this.data.clockOut,
      })
    }
    // this.logs.push({ inTime: '', outTime: '' });
  }
  removeLog(index: number) {
    this.logs.splice(index);
  }


  // submitdata() {
  //   if (this.attendaseform.valid) {
  //     console.log('Form Data:', this.attendaseform.value);
  //     this.services.creatRegular(this.attendaseform.value).subscribe(() => {
  //       console.log("successfully add")
  //       this.dialogref.close(true);
  //     })

  //   }
  // }
 
  combine(date: Date, time: string): string {
    const [h, m] = time.split(':').map(Number);
    return new Date(date.setHours(h, m, 0, 0)).toISOString();
  }

  submitdata(): void {
    if (!this.attendaseform.valid) {
      this.toaster.warning('Please fill all required fields');
      return;
    }

    const { selectedDate, clockIn, clockOut, Reason } = this.attendaseform.getRawValue();

    if (!selectedDate || !clockIn || !clockOut || !Reason) {
      this.toaster.warning('All fields are required');
      return;
    }

    const payload = {
      RequestType: 'Regularization',
      Reason,
      RequestedDate: selectedDate.toISOString(),
        clockIn: this.combine(selectedDate, clockIn),
        clockOut: this.combine(selectedDate, clockOut),
    };

    this.services.creatRegular(payload).subscribe({
      next: () => {
        this.toaster.success('Regularization request submitted');
        this.dialogref.close(true);
      },
      error: (err) => {
        console.error('API error:', err);
        this.toaster.error('Submission failed');
      }
    });
  }

  closeDialog() {
    this.dialogref.close();
  }
}
