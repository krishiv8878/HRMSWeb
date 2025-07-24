import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-information',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, MatIcon, ReactiveFormsModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss'
})
export class InformationComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }
  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)

  profileForm = this.formbuilder.group({
    firstName: [''],
    lastName: [''],
    emailAddress: [''],
    mobileNumber: [''],
    dateOfJoining: [''],
    gender: [''],
    currentAddress: [''],
    dateOfBirth: [''],
  })
  
  id!: any;
  ngOnInit() {
    this.profileForm.patchValue(this.data)

  }
  submitProfile() {
    this.services.updateData(this.profileForm.value).then(
      () => {
        this.toaster.success('Recode Successfully Added')
      }).catch(err=> {
        console.log("invalid data", err)
      })
  }
}
