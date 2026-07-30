import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatCard } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SkillservicesService } from '../../../services/skill/skillservices.service';


@Component({
  selector: 'app-education-details',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, ReactiveFormsModule, MatCard],
  providers: [provideNativeDateAdapter()],
  templateUrl: './education-details.component.html',
  styleUrl: './education-details.component.scss'
})
export class EducationDetailsComponent {
  constructor(private _dilogref: MatDialogRef<EducationDetailsComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }
  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  skillservices = inject(SkillservicesService)
  skills: any[] = [];


  educationDetailsForm = this.formbuilder.group({
    id: [localStorage.getItem('employeeId') || ''],
    firstName: [''],
    lastName: [''],
    emailAddress: [''],
    mobileNumber: [''],
    permanentAddress: [''],
    gender: [''],
    currentAddress: [''],
    designation: [''],
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
    skills: [''],
    skillIds: [[]],
  })
  ngOnInit() {
    this.skillservices.getSkill().subscribe((skills: any) => {
      this.skills = skills.data;
    })
    this.educationDetailsForm.patchValue(this.data)
  }
  submitEducationDetails() {
    const formValue = this.educationDetailsForm.getRawValue();
    const payload = {
      ...formValue,
      yearOfPassing: formValue.yearOfPassing
        ? new Date(formValue.yearOfPassing as any).getFullYear()
        : null
    };
    this.services.updateData(payload).subscribe({
      next: (res) => {
        this.toaster.success('Education Details Added Successfully', 'Success');
        this.router.navigate(['/userprofile']);
        this._dilogref.close(true);
      },
      error: (err) => {
        this.toaster.error('Failed to add Education Details', 'Error');
      }
    });
    console.log("edu details", this.educationDetailsForm.value)
  }
}
