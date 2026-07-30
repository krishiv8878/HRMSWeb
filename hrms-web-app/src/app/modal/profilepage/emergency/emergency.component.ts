import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { SkillservicesService } from '../../../services/skill/skillservices.service';

@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, ReactiveFormsModule, MatCard],
  templateUrl: './emergency.component.html',
  styleUrl: './emergency.component.scss'
})
export class EmergencyComponent {
  constructor(private _dilogref : MatDialogRef<EmergencyComponent>,@Inject(MAT_DIALOG_DATA) public data: any) { }

  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  skillservices = inject(SkillservicesService)
  skills : any[] = [];

  contact = this.formbuilder.group({
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

  ngOnInit() {
    this.skillservices.getSkill().subscribe((skills: any) => {
      this.skills = skills.data;
    })
    this.contact.patchValue(this.data)
  }
  submitcontact() {
    this.services.updateData(this.contact.value).subscribe({
      next: () => {
        this.toaster.success('Record Successfully Added')
        this._dilogref.close(true);
      }, error: (err) => {
        console.log("invalid data", err)
      }
    })
  }
}
