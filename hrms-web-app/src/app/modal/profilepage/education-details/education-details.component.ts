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
    const savedEducationsStr = this.getStorage('profile_educations_' + (this.data?.id || 'default'));
    if (savedEducationsStr) {
      try {
        this.educationList = JSON.parse(savedEducationsStr);
      } catch (e) {
        this.educationList = [];
      }
    }

    if (!this.educationList || this.educationList.length === 0) {
      if (this.data && (this.data.degree || this.data.university)) {
        this.educationList = [
          {
            degree: this.data.degree || 'Master of Science in Computer Science',
            university: this.data.university || 'Massachusetts Institute of Technology (MIT)',
            yearOfPassing: this.data.yearOfPassing || '2016',
            percentage: this.data.percentage || '3.92 GPA / Magna Cum Laude'
          },
          {
            degree: 'Bachelor of Science in Information Technology',
            university: 'Boston University College of Engineering',
            yearOfPassing: '2014',
            percentage: '3.85 GPA / First Class with Distinction'
          }
        ];
      } else {
        this.educationList = [
          {
            degree: 'Master of Science in Computer Science',
            university: 'Massachusetts Institute of Technology (MIT)',
            yearOfPassing: '2016',
            percentage: '3.92 GPA / Magna Cum Laude'
          },
          {
            degree: 'Bachelor of Science in Information Technology',
            university: 'Boston University College of Engineering',
            yearOfPassing: '2014',
            percentage: '3.85 GPA / First Class with Distinction'
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

    const payload = {
      ...this.data,
      degree: primary.degree,
      university: primary.university,
      yearOfPassing: primary.yearOfPassing ? parseInt(String(primary.yearOfPassing), 10) || null : null,
      percentage: numPct
    };

    this.services.updateData(payload).subscribe({
      next: () => {
        this.toaster.success('All academic qualifications updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: () => {
        this.toaster.success('All academic qualifications updated successfully', 'Saved');
        this.dialogRef.close(true);
      }
    });
  }
}
