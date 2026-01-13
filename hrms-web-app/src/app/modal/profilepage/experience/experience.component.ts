import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [ReactiveFormsModule, MatCard, MatInputModule, MatButton, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss'
})
export class ExperienceComponent {
  constructor(private _dilogref : MatDialogRef<ExperienceComponent>,@Inject(MAT_DIALOG_DATA) public data: any) { }
  services = inject(EmployeeService)
  router = inject(Router)
  toaster = inject(ToastrService)

  formbuilder = inject(FormBuilder)
  experienceForm = this.formbuilder.group({
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
    //* primary contact
    primaryEmailAddress: [''],

  })
  ngOnInit() {
    this.experienceForm.patchValue(this.data)
  }
  submitExperience() {
    this.services.updateData(this.experienceForm.value).subscribe({
      next: () => {
        this.toaster.success('Record Successfully Added')
        this._dilogref.close(true);
      }, error: (err) => {
        console.log("error", err)
      }
    })
  }
}
