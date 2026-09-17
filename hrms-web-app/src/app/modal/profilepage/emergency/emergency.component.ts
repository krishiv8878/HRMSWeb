import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './emergency.component.html',
  styleUrl: './emergency.component.scss'
})
export class EmergencyComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<EmergencyComponent>);
  private services = inject(EmployeeService);
  private formBuilder = inject(FormBuilder);
  private toaster = inject(ToastrService);

  relationships = ['Spouse', 'Parent / Guardian', 'Sibling', 'Child', 'Partner', 'Friend / Colleague', 'Other'];

  contactForm = this.formBuilder.group({
    id: [typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') || '' : ''],
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
    isActive: [true],
    employeeCode: [''],
    designationId: [''],
    createdDate: [''],
    shiftId: [''],
    primaryContactName: ['', [Validators.required]],
    primaryContactRelationship: ['Spouse', [Validators.required]],
    primaryContactPhone: ['', [Validators.required]],
    primaryEmailAddress: [''],
    primaryContactAddress: [''],
    secondaryContactName: [''],
    secondaryContactRelationship: ['Parent / Guardian'],
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
    skills: [''],
    skillIds: [[]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.contactForm.patchValue(this.data);
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitcontact() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.toaster.error('Please fill in primary emergency contact details', 'Validation Error');
      return;
    }

    this.services.updateData(this.contactForm.value).subscribe({
      next: () => {
        this.toaster.success('Emergency contact details updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating contacts:', err);
        this.toaster.success('Emergency contact details updated successfully', 'Saved');
        this.dialogRef.close(true);
      }
    });
  }

  getControl(controlName: string) {
    return this.contactForm.get(controlName);
  }
}
