import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-passportinfo',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, ReactiveFormsModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './passportinfo.component.html',
  styleUrl: './passportinfo.component.scss'
})
export class PassportinfoComponent {
  constructor(private _dilogref : MatDialogRef<PassportinfoComponent>,@Inject(MAT_DIALOG_DATA) public data: any) { }
  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)

  passportinfo = this.formbuilder.group({
    id : [localStorage.getItem('employeeId') || ''],
    firstName: [''],
    lastName: [''],
    emailAddress: [''],
    mobileNumber: [''],
    permanentAddress: [''],
    gender: [''],
    currentAddress: [''],
    designation : [''],
    dateOfJoining: [''],
    createdBy: 0,
    roleIds: [[]],
    rolenames: [[]],
    managerId: [0],
    managerName: [''],
    isActive: [],
    employeeCode: [''],
    designationId: [''],
    createdDate: [''],
    shiftId: [''],
    primaryContactName: [''],
    primaryContactRelationship: [''],
    primaryContactPhone: [''],
    primaryContactEmail: [''],
    primaryContactAddress: [''],
    secondaryContactName: [''],
    secondaryContactRelationship: [''],
    secondaryContactPhone: [''],
    secondaryContactEmail: [''],
    secondaryContactAddress: [''],
    degree: [''],
    university: [''],
    yearOfPassing: [''],
    percentage: [''],
    companyName: [''],
    experienceDuration: [''],
    experienceLocation: [''],
    responsibilities: [''],
    passportNumber: [''],
    nationality: [''],
    passportIssueDate: [''],
    passportExpiryDate: [''],
    passportScanCopy: [''],
    branch: [''],
    dateOfBirth: [''],
    primaryEmailAddress: [''],
  })
  ngOnInit() { 
    this.passportinfo.patchValue(this.data)
  }
  submitpassportinfo() {
    this.services.updateData(this.passportinfo.value).subscribe({
      next: () => {
        this.toaster.success('Record Successfully Added')
        this._dilogref.close(true);
      }, error: (err) => {
        console.log("invalid data", err)
      }
    })
   }
  onFileChange() { }
}
