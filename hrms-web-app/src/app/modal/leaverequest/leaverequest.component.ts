import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmailService } from '../../services/leaveRequest/email.service';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { ToastrService } from 'ngx-toastr';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatRadioButton, MatRadioModule } from '@angular/material/radio';
@Component({
  selector: 'app-leaverequest',
  standalone: true,
  imports: [MatDatepickerModule, CommonModule, MatFormField, ReactiveFormsModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogClose, MatRadioButton, MatRadioModule],
  providers: [provideNativeDateAdapter(),
  ],
  templateUrl: './leaverequest.component.html',
  styleUrl: './leaverequest.component.scss'
})
export class LeaverequestComponent {
  constructor( private _dialogref: MatDialogRef<LeaverequestComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) { }

  services = inject(EmailService)
  service = inject(LeavetypeService)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  leavetype: any;
  email: any;
  employeeId: any;
  isEdit : boolean = false;


  leaveRequestForm = this.formbuilder.group({
    id: 0,
    leaveTypeId: [0, [Validators.required]],
    // employeeId: 0,
    leaveReason: [''],
    leaveMode: [''],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    isDeleted :[false],
    isActive : [true]
  })

  ngOnInit() {
this.leaveRequestForm.patchValue(this.data)
if(this.data){
  console.log("this.data",this.data)
  this.isEdit = true
}
    // Get user data from sessionStorage
    // this.email = localStorage.getItem('userEmail');
    // this.employeeId = localStorage.getItem('userId');
    this.LeaveTypes();
  }
  LeaveTypes() {
    this.service.getAllData().subscribe((leavetype: any) => {
      this.leavetype = leavetype.data;
      console.log("leavess", this.leavetype)
    })
  }

  onSubmit() {


    console.log('Form Value:', this.leaveRequestForm.value);
    if(!this.isEdit){
      
      this.services.Leaverequest(this.leaveRequestForm.value).subscribe({
        next: (val: any) => {
          this.toaster.success('leaveRequest Successfully Added', 'Success');
          this._dialogref.close(true)
        },
        error: (error) => {
          console.error('API Error:', error);
          this.toaster.error('Something went wrong!', 'Error');
        }
      });
    } else  { 
      this.services.UpdateLeaverequest(this.leaveRequestForm.value).subscribe({
        next: (val: any) => {
          this.toaster.success('Leave Request Updated Successfully.', 'Success');
          this._dialogref.close(true)
        },
        error: (error) => {
          console.error('API Error:', error);
          this.toaster.error('Something went wrong!', 'Error');
        }
      });
    }
  }
}
