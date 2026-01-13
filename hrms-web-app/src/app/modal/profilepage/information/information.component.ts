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
import { SkillservicesService } from '../../../services/skill/skillservices.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-information',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, MatIcon, ReactiveFormsModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss'
})
export class InformationComponent {
  constructor(private _dilogref : MatDialogRef<InformationComponent>,@Inject(MAT_DIALOG_DATA) public data: any) { }
  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  skillservices = inject(SkillservicesService)
  toaster = inject(ToastrService)
  skills : any[] = [];

  profileForm = this.formbuilder.group({
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
    skills : [''],
    skillIds : [[]],
  })
  
  id!: any;
  ngOnInit() {
    this.skillservices.getSkill().subscribe((skills: any) => {
      this.skills = skills.data;
    })
    this.profileForm.patchValue(this.data)
  }
  submitProfile() {
    this.services.updateData(this.profileForm.value).subscribe({
      next: () => {
        this.toaster.success('Record Successfully Added')
        this._dilogref.close(true);
      }, error: (err) => {
        console.log("invalid data", err)
      }
    })
  }
}
