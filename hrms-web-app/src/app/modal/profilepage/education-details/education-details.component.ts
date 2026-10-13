import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';

import { EmployeeService } from '../../../services/employee/employee.service';

export interface EducationEntry {
  degree: string;
  university: string;
  yearOfPassing: string;
  percentage: string;
}

@Component({
  selector: 'app-education-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './education-details.component.html',
  styleUrl: './education-details.component.scss'
})
export class EducationDetailsComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<EducationDetailsComponent>);
  private services = inject(EmployeeService);
  private toaster = inject(ToastrService);

  educationList: EducationEntry[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  private getStorage(key: string): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private setStorage(key: string, value: string): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }
  }

  ngOnInit() {
    if (this.data?.responsibilities && typeof this.data.responsibilities === 'string') {
      try {
        const parsed = JSON.parse(this.data.responsibilities);
        if (Array.isArray(parsed.educations) && parsed.educations.length > 0) {
          this.educationList = parsed.educations;
        }
      } catch (e) {}
    }

    if (!this.educationList || this.educationList.length === 0) {
      const savedEducationsStr = this.getStorage('profile_educations_' + (this.data?.id || 'default'));
      if (savedEducationsStr) {
        try {
          this.educationList = JSON.parse(savedEducationsStr);
        } catch (e) {
          this.educationList = [];
        }
      }
    }

    if (!this.educationList || this.educationList.length === 0) {
      if (this.data && (this.data.degree || this.data.university)) {
        this.educationList = [
          {
            degree: this.data.degree || '',
            university: this.data.university || '',
            yearOfPassing: this.data.yearOfPassing ? String(this.data.yearOfPassing) : '',
            percentage: this.data.percentage ? String(this.data.percentage) : ''
          }
        ];
      } else {
        this.educationList = [
          {
            degree: '',
            university: '',
            yearOfPassing: '',
            percentage: ''
          }
        ];
      }
    }
  }

  addEducation() {
    this.educationList.push({
      degree: '',
      university: '',
      yearOfPassing: '',
      percentage: ''
    });
    this.toaster.info('Added new qualification slot', 'New Entry');
  }

  removeEducation(index: number) {
    if (this.educationList.length > 1) {
      this.educationList.splice(index, 1);
      this.toaster.warning('Qualification entry removed', 'Removed');
    } else {
      this.toaster.warning('At least one education record is required', 'Cannot Remove');
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitEducationDetails() {
    const validEntries = this.educationList.filter(e => (e.degree && e.degree.trim()) || (e.university && e.university.trim()));
    if (validEntries.length === 0) {
      this.toaster.error('Please enter at least one degree and institution', 'Validation Error');
      return;
    }

    const primary = validEntries[0];
    const key = 'profile_educations_' + (this.data?.id || 'default');
    this.setStorage(key, JSON.stringify(validEntries));

    let numPct: number | null = null;
    if (primary.percentage !== undefined && primary.percentage !== null) {
      const match = String(primary.percentage).match(/[-+]?[0-9]*\.?[0-9]+/);
      numPct = match ? parseFloat(match[0]) : null;
    }

    let currentPayload: any = {};
    if (this.data?.responsibilities && typeof this.data.responsibilities === 'string') {
      try {
        currentPayload = JSON.parse(this.data.responsibilities);
      } catch {
        currentPayload = { workResponsibilities: this.data.responsibilities };
      }
    }
    currentPayload.educations = validEntries;

    const payload = {
      ...this.data,
      profileCompleted: typeof this.data?.profileCompleted === 'boolean'
        ? this.data.profileCompleted
        : (this.data?.profileCompleted ? Boolean(this.data.profileCompleted) : false),
      degree: primary.degree,
      university: primary.university,
      yearOfPassing: primary.yearOfPassing ? parseInt(String(primary.yearOfPassing), 10) || null : null,
      percentage: numPct,
      responsibilities: JSON.stringify(currentPayload)
    };

    this.services.updateData(payload).subscribe({
      next: () => {
        this.toaster.success('All academic qualifications updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error('Error updating education details:', err);
        this.toaster.error(err?.error?.message || 'Failed to update academic qualifications', 'Error');
      }
    });
  }
}
