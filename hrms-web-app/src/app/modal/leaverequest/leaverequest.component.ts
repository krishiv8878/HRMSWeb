import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmailService } from '../../services/leaveRequest/email.service';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-leaverequest',
  standalone: true,
  imports: [MatDatepickerModule, CommonModule, MatFormField, ReactiveFormsModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leaverequest.component.html',
  styleUrl: './leaverequest.component.scss'
})
export class LeaverequestComponent {
  constructor(private _dialogref: MatDialogRef<LeaverequestComponent>,) { }

  services = inject(EmailService)
  service = inject(LeavetypeService)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  leavetype: any;
  email: any;
  employeeId: any;

  leaveRequestForm = this.formbuilder.group({
    // id: 0,
    type: ['', [Validators.required]],
    // employeeId: 0,
    LeaveReason: [''],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
  })

  ngOnInit() {
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
    // const leaveData = {
    //   ...this.leaveRequestForm.value,
    //   employeeId: this.employeeId,
    //   email: this.email
    // };
    // console.log('Sending leave data:', leaveData);

    console.log('Form Value:', this.leaveRequestForm.value);
    this.services.Leaverequest(this.leaveRequestForm.value).subscribe({
      next: (val:any) => {
        this.toaster.success('Successfully added data', 'Success');
        this._dialogref.close(true)
      },
      error: (error) => {
        console.error('API Error:', error);
        this.toaster.error('Something went wrong!', 'Error');
      }
    });
  }
}
