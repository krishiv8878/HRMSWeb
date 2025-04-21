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
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose, MatSelectModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent {
  constructor(private _dialogref: MatDialogRef<LeaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  services = inject(LeavetypeService)
  formbuilder = inject(FormBuilder)
  isEdit = false;
  toaster = inject(ToastrService)

  leavetype = this.formbuilder.group({
    id: 0,
    leaveName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    type: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    description: ['',[Validators.required,]],
      isActive: [true, [Validators.required, Validators.pattern('true|false')]]
  })

  id!: any;
  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      console.log('Payment ID:', this.id);
      this.leavetype.patchValue(this.data);
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
    if (this.leavetype.invalid) {
      this.leavetype.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        // leaveName: "Leave Name is Required",
        type: "Leave Type is Required",
        description: "Description is Required",
        isActive: " Please select a Active Button",       
      
      };

      for (const field in errorMessages) {
        const control = this.leavetype.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.leavetype.value, this.id).subscribe({
     
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.leavetype.value).subscribe({
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
    return this.leavetype.get(controleName);
  }
}
