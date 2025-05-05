import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-designations',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './designations.component.html',
  styleUrl: './designations.component.scss'
})
export class DesignationsComponent {
  constructor(private _dialogref: MatDialogRef<DesignationsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  formbuilder = inject(FormBuilder)
  services = inject(DesignationservicesService)
  isEdit = false;
  toaster = inject(ToastrService)

  designation = this.formbuilder.group({
    id: 0,
    designationName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    isActive: [true,[Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.designation.patchValue(this.data);
    if (this.data) {
      this.isEdit = true
    }
  }
   
  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    // Allow letters and space only
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

 
  
  submitdata() {
    if (this.designation.invalid) {
      this.designation.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        designationName: "Designation Name Is Required",
         isActive:" Please select a Active Button"
      };

      for (const field in errorMessages) {
        const control = this.designation.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.designation.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('Designation Recode Successfully Updated', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.designation.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success('Designation Recode Successfully Added', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
  getControl(controleName: string) {
    return this.designation.get(controleName);
  }
}
