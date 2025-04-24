import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeshiftService } from '../../services/shift/employeeshift.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-shift',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose, MatSelectModule],
  templateUrl: './shift.component.html',
  styleUrl: './shift.component.scss'
})
export class ShiftComponent {
  constructor(private _dialogref: MatDialogRef<ShiftComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  formbuilder = inject(FormBuilder)
  services = inject(EmployeeshiftService)
  route = inject(ActivatedRoute)
  toaster = inject(ToastrService)
  isEdit = false;

  shiftForm = this.formbuilder.group({
    id: 0,
    shiftName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    startTime: ['', [Validators.required, Validators.pattern('^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$')]],
    endTime: ['', [Validators.required, Validators.pattern('^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$')]],
      isActive: [true, [Validators.required, Validators.pattern('true|false')]]
  })
id!:any;
  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      console.log('Payment ID:', this.id);
      this.shiftForm.patchValue(this.data);
    }
  }
 
  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    // Allow letters and space only
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }
  
  allowTimeFormat(event: KeyboardEvent) {
    const key = event.key;
    // Allow only digits and colon
    if (!/^[0-9:]$/.test(key)) {
      event.preventDefault();
    }
  }
  
  
  submitdata() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        shiftName: "Shift Name Is Required",
        startTime: "Time Formate Invalide",
        endTime: "Time Formate Invalide",
       //isActive: " Please select a Active Button"
      };

      for (const field in errorMessages) {
        const control = this.shiftForm.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.shiftForm.value, this.id).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('Recode Successfully Updated', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.shiftForm.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success(' Recode Successfully Added', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
  getControl(controleName: string) {
    return this.shiftForm.get(controleName);
  }
}
