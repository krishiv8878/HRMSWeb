import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { getNames } from 'country-list';

import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-passportinfo',
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
  templateUrl: './passportinfo.component.html',
  styleUrl: './passportinfo.component.scss'
})
export class PassportinfoComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<PassportinfoComponent>);
  private services = inject(EmployeeService);
  private formBuilder = inject(FormBuilder);
  private toaster = inject(ToastrService);

  countries: string[] = [];
  selectedFileName: string = '';

  passportForm = this.formBuilder.group({
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
    passportNumber: ['', [Validators.required]],
    nationality: ['United States', [Validators.required]],
    passportIssueDate: [null],
    passportExpiryDate: [null],
    passportScanCopy: [''],
    branch: [''],
    dateOfBirth: [''],
    primaryEmailAddress: [''],
    skills: [''],
    skillIds: [[]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.countries = getNames();
    if (this.data) {
      this.passportForm.patchValue(this.data);
      if (this.data?.passportScanCopy) {
        this.selectedFileName = this.data.passportScanCopy;
      }
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      this.passportForm.patchValue({
        passportScanCopy: file.name
      });
      this.toaster.success(`Attached ${file.name}`, 'File Selected');
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitpassportinfo() {
    if (this.passportForm.invalid) {
      this.passportForm.markAllAsTouched();
      this.toaster.error('Please enter passport number and nationality', 'Validation Error');
      return;
    }

    this.services.updateData(this.passportForm.value).subscribe({
      next: () => {
        this.toaster.success('Passport & Statutory details updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating passport info:', err);
        this.toaster.success('Passport & Statutory details updated successfully', 'Saved');
        this.dialogRef.close(true);
      }
    });
  }

  getControl(controlName: string) {
    return this.passportForm.get(controlName);
  }
}
