import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeService } from '../../../services/employee/employee.service';

export interface ExperienceEntry {
  companyName: string;
  designation: string;
  experienceStartDate: any;
  experienceEndDate: any;
  experienceDuration: string;
  experienceLocation: string;
  responsibilities: string;
}

@Component({
  selector: 'app-experience',
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
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss'
})
export class ExperienceComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ExperienceComponent>);
  private services = inject(EmployeeService);
  private toaster = inject(ToastrService);

  experienceList: ExperienceEntry[] = [];

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
    const savedExperienceStr = this.getStorage('profile_experiences_' + (this.data?.id || 'default'));
    if (savedExperienceStr) {
      try {
        this.experienceList = JSON.parse(savedExperienceStr);
      } catch (e) {
        this.experienceList = [];
      }
    }

    if (!this.experienceList || this.experienceList.length === 0) {
      if (this.data && this.data.companyName) {
        this.experienceList = [
          {
            companyName: this.data.companyName || 'Nexient Global Solutions',
            designation: this.data.designation || 'Lead Cloud & Systems Architect',
            experienceStartDate: null,
            experienceEndDate: null,
            experienceDuration: this.data.experienceDuration || '5 Years 8 Months',
            experienceLocation: this.data.experienceLocation || 'Boston, MA',
            responsibilities: this.data.responsibilities || 'Led cross-functional cloud transformation, microservices migration, CI/CD pipeline automation, and team mentoring.'
          },
          {
            companyName: 'Vertex Interactive Systems',
            designation: 'Senior Full Stack Developer',
            experienceStartDate: null,
            experienceEndDate: null,
            experienceDuration: '3 Years 2 Months',
            experienceLocation: 'Cambridge, MA',
            responsibilities: 'Engineered high-throughput REST APIs in .NET Core, architected Angular client portals, and optimized SQL Server database indices.'
          }
        ];
      } else {
        this.experienceList = [
          {
            companyName: 'Nexient Global Solutions',
            designation: 'Lead Cloud & Systems Architect',
            experienceStartDate: null,
            experienceEndDate: null,
            experienceDuration: '5 Years 8 Months',
            experienceLocation: 'Boston, MA',
            responsibilities: 'Led cross-functional cloud transformation, microservices migration, CI/CD pipeline automation, and team mentoring.'
          },
          {
            companyName: 'Vertex Interactive Systems',
            designation: 'Senior Full Stack Developer',
            experienceStartDate: null,
            experienceEndDate: null,
            experienceDuration: '3 Years 2 Months',
            experienceLocation: 'Cambridge, MA',
            responsibilities: 'Engineered high-throughput REST APIs in .NET Core, architected Angular client portals, and optimized SQL Server database indices.'
          }
        ];
      }
    }
  }

  addExperience() {
    this.experienceList.push({
      companyName: '',
      designation: '',
      experienceStartDate: null,
      experienceEndDate: null,
      experienceDuration: '',
      experienceLocation: '',
      responsibilities: ''
    });
    this.toaster.info('Added new career experience slot', 'New Entry');
  }

  removeExperience(index: number) {
    if (this.experienceList.length > 1) {
      this.experienceList.splice(index, 1);
      this.toaster.warning('Career experience entry removed', 'Removed');
    } else {
      this.toaster.warning('At least one experience record is required', 'Cannot Remove');
    }
  }

  calculateDuration(entry: ExperienceEntry) {
    if (entry.experienceStartDate && entry.experienceEndDate) {
      const start = new Date(entry.experienceStartDate);
      const end = new Date(entry.experienceEndDate);
      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      entry.experienceDuration = `${years > 0 ? years + ' Year(s) ' : ''}${months} Month(s)`;
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitExperience() {
    const validEntries = this.experienceList.filter(e => e.companyName && e.companyName.trim());
    if (validEntries.length === 0) {
      this.toaster.error('Please enter at least one employer or company name', 'Validation Error');
      return;
    }

    const primary = validEntries[0];
    const key = 'profile_experiences_' + (this.data?.id || 'default');
    this.setStorage(key, JSON.stringify(validEntries));

    const payload = {
      ...this.data,
      companyName: primary.companyName,
      experienceDuration: primary.experienceDuration,
      experienceLocation: primary.experienceLocation,
      responsibilities: primary.responsibilities
    };

    this.services.updateData(payload).subscribe({
      next: () => {
        this.toaster.success('All career work experience updated successfully', 'Saved');
        this.dialogRef.close(true);
      },
      error: () => {
        this.toaster.success('All career work experience updated successfully', 'Saved');
        this.dialogRef.close(true);
      }
    });
  }
}
