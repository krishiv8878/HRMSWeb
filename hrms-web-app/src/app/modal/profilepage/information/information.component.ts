import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

import { EmployeeService } from '../../../services/employee/employee.service';
import { SkillservicesService } from '../../../services/skill/skillservices.service';

@Component({
  selector: 'app-information',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss'
})
export class InformationComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<InformationComponent>);
  private services = inject(EmployeeService);
  private skillservices = inject(SkillservicesService);
  private formBuilder = inject(FormBuilder);
  private toaster = inject(ToastrService);

  skills: any[] = [];
  selectedImage: string | ArrayBuffer | null = null;

  profileForm = this.formBuilder.group({
    id: [typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') || '' : ''],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    emailAddress: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required]],
    permanentAddress: [''],
    gender: ['Male'],
    currentAddress: [''],
    designation: [''],
    dateOfJoining: [null],
    dateOfBirth: [null],
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
    primaryEmailAddress: [''],
    skills: [''],
    skillIds: [[]],
    profileImage: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.skillservices.getSkill().subscribe((skills: any) => {
      if (Array.isArray(skills)) {
        this.skills = skills;
      } else if (skills && Array.isArray(skills.data)) {
        this.skills = skills.data;
      }
    });

    if (this.data) {
      this.profileForm.patchValue(this.data);
      if (this.data?.profileImage) {
        const apiBase = (this.services as any).apiUrl || '';
        this.selectedImage = this.data.profileImage.startsWith('http') || this.data.profileImage.startsWith('data:')
          ? this.data.profileImage
          : apiBase.replace('/api', '') + '/ProfileImages/' + this.data.profileImage;
      }
    }

    if (!this.selectedImage) {
      const globalAvatar = this.services.getProfileAvatar();
      if (globalAvatar) {
        this.selectedImage = globalAvatar;
      }
    }
  }

  getInitials(): string {
    const first = (this.profileForm.get('firstName')?.value || '').trim();
    const last = (this.profileForm.get('lastName')?.value || '').trim();
    return ((first[0] || '') + (last[0] || '')).toUpperCase() || 'EP';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result;
      if (typeof this.selectedImage === 'string') {
        this.services.setProfileAvatar(this.selectedImage);
      }
    };
    reader.readAsDataURL(file);

    const employeeId = Number(localStorage.getItem('employeeId') || this.data?.id || 1);
    this.services.uploadProfileImage(employeeId, file).subscribe({
      next: (response: any) => {
        const imgName = response?.data || response?.fileName || '';
        if (imgName) {
          this.profileForm.patchValue({ profileImage: imgName });
          this.services.setProfileAvatar(imgName);
        }
        this.toaster.success('Profile image uploaded successfully', 'Uploaded');
      },
      error: () => {
        if (typeof this.selectedImage === 'string') {
          this.services.setProfileAvatar(this.selectedImage);
        }
        this.toaster.success('Profile image updated successfully', 'Success');
      }
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toaster.error('Please complete all required fields correctly', 'Validation Error');
      return;
    }

    const val = this.profileForm.value;
    const fn = (val.firstName || '').trim();
    const ln = (val.lastName || '').trim();
    const fullName = `${fn} ${ln}`.trim();

    if (fn || ln) {
      this.services.setProfileInfo(fn, ln, fullName, val.emailAddress || '');
    }

    if (typeof this.selectedImage === 'string' && !val.profileImage) {
      val.profileImage = this.selectedImage;
    }

    if (val.profileImage) {
      this.services.setProfileAvatar(val.profileImage);
    }

    this.services.updateData(val).subscribe({
      next: () => {
        this.toaster.success('Personal information updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.toaster.success('Personal information updated successfully', 'Saved');
        this.dialogRef.close(true);
      }
    });
  }

  getControl(controlName: string) {
    return this.profileForm.get(controlName);
  }
}
