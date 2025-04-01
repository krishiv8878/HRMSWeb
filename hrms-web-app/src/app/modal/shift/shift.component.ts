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
    isActive: ['', [Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.shiftForm.patchValue(this.data)
    if (this.data) {
      this.isEdit = true
    }
  }
  allowOnlyLetters(event: KeyboardEvent) {
    if (!/^[a-zA-Z ]$/.test(event.key)) event.preventDefault();
  }
  preventInvalidInput(event: KeyboardEvent) {
    const input = (event.target as HTMLInputElement).value;
    const char = event.key;
  
    if (!/[\d:]/.test(char) || (char === ":" && (input.match(/:/g)?.length ?? 0) >= 1) || 
        (input.length === 0 && !/\d/.test(char)) || input.length >= 5) {
      event.preventDefault();
    }
  }
  
  preventPaste(event: ClipboardEvent) {
    if (!/^\d{2}:\d{2}$/.test(event.clipboardData?.getData("text") || "")) {
      event.preventDefault();
      this.toaster.error("Invalid time format. Use HH:MM", "Validation Error");
    }
  }
  
  submitdata() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        shiftName: "Shift Name is required",
        startTime: "Time Formate Invalide",
        endTime: "Time Formate Invalide",
        isActive: " Please select a Active Button"
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
      this.services.updateData(this.shiftForm.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.shiftForm.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success('successfully add data', 'success')
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
