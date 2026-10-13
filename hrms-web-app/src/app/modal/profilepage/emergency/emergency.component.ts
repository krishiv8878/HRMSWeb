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
    primaryContactName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s.'-]+$/), Validators.minLength(2), Validators.maxLength(100)]],
    primaryContactRelationship: ['Spouse', [Validators.required]],
    primaryContactPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    primaryEmailAddress: ['', [Validators.email, Validators.maxLength(100)]],
    primaryContactAddress: ['', [Validators.maxLength(200)]],
    secondaryContactName: ['', [Validators.pattern(/^[a-zA-Z\s.'-]*$/), Validators.maxLength(100)]],
    secondaryContactRelationship: ['Parent / Guardian'],
    secondaryContactPhone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
    secondaryContactEmail: ['', [Validators.email, Validators.maxLength(100)]],
    secondaryContactAddress: ['', [Validators.maxLength(200)]],
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

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(key)) return;
    if (!/^[a-zA-Z\s.'-]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(key)) return;
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  onPhoneInput(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
    this.contactForm.get(controlName)?.setValue(cleaned);
  }

  onPhonePaste(event: ClipboardEvent, controlName: string) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const cleaned = pasted.replace(/[^0-9]/g, '').slice(0, 10);
    this.contactForm.get(controlName)?.setValue(cleaned);
  }

  submitcontact() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      const controls = this.contactForm.controls;
      if (controls['primaryContactName'].invalid) {
        if (controls['primaryContactName'].hasError('required')) {
          this.toaster.error('Primary contact name is required', 'Validation Error');
        } else {
          this.toaster.error('Primary contact name can only contain letters and spaces', 'Validation Error');
        }
      } else if (controls['primaryContactRelationship'].invalid) {
        this.toaster.error('Primary contact relationship is required', 'Validation Error');
      } else if (controls['primaryContactPhone'].invalid) {
        if (controls['primaryContactPhone'].hasError('required')) {
          this.toaster.error('Primary emergency phone is required', 'Validation Error');
        } else {
          this.toaster.error('Primary emergency phone must be a valid 10-digit number (numeric only)', 'Validation Error');
        }
      } else if (controls['primaryEmailAddress'].invalid) {
        this.toaster.error('Please enter a valid email address for primary contact', 'Validation Error');
      } else if (controls['primaryContactAddress'].invalid) {
        this.toaster.error('Primary residential address cannot exceed 200 characters', 'Validation Error');
      } else if (controls['secondaryContactName'].invalid) {
        this.toaster.error('Secondary contact name can only contain letters and spaces', 'Validation Error');
      } else if (controls['secondaryContactPhone'].invalid) {
        this.toaster.error('Secondary emergency phone must be a valid 10-digit number (numeric only)', 'Validation Error');
      } else if (controls['secondaryContactEmail'].invalid) {
        this.toaster.error('Please enter a valid email address for secondary contact', 'Validation Error');
      } else if (controls['secondaryContactAddress'].invalid) {
        this.toaster.error('Secondary residential address cannot exceed 200 characters', 'Validation Error');
      } else {
        this.toaster.error('Please fill in valid emergency contact details', 'Validation Error');
      }
      return;
    }

    const val = { ...this.contactForm.value };
    if (val.primaryContactName) val.primaryContactName = val.primaryContactName.trim();
    if (val.primaryContactPhone) val.primaryContactPhone = String(val.primaryContactPhone).replace(/[^0-9]/g, '').slice(0, 10);
    if (val.primaryEmailAddress) val.primaryEmailAddress = val.primaryEmailAddress.trim();
    if (val.primaryContactAddress) val.primaryContactAddress = val.primaryContactAddress.trim();
    if (val.secondaryContactName) val.secondaryContactName = val.secondaryContactName.trim();
    if (val.secondaryContactPhone) val.secondaryContactPhone = String(val.secondaryContactPhone).replace(/[^0-9]/g, '').slice(0, 10);
    if (val.secondaryContactEmail) val.secondaryContactEmail = val.secondaryContactEmail.trim();
    if (val.secondaryContactAddress) val.secondaryContactAddress = val.secondaryContactAddress.trim();

    this.services.updateData(val).subscribe({
      next: () => {
        this.toaster.success('Emergency contact details updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating contacts:', err);
        this.toaster.error(err?.error?.message || 'Failed to update emergency contact details', 'Save Error');
      }
    });
  }

  getControl(controlName: string) {
    return this.contactForm.get(controlName);
  }
}
