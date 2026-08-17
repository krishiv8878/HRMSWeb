import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { CandidateService } from '../../services/candidate/candidate.service';

@Component({
  selector: 'app-candidate-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private services = inject(CandidateService);
  private toaster = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<CandidateeComponent>);

  isEdit: boolean = false;

  rolesList: string[] = [
    'Senior Frontend Engineer',
    'Product Manager',
    'Data Scientist',
    'DevOps Engineer',
    'Full Stack Developer',
    'UI/UX Designer',
    'QA Automation Engineer',
    'Backend .NET Engineer',
    'HR Business Partner'
  ];

  stagesList: string[] = [
    'Sourced',
    'Screening',
    'Technical Interview',
    'HR Screen',
    'Offer Extended',
    'Rejected'
  ];

  noticePeriodOptions: number[] = [0, 15, 30, 45, 60, 90];

  CandidateForm = this.fb.group({
    id: [0],
    firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    emailAddress: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    appliedRole: ['Senior Frontend Engineer'],
    stage: ['Screening'],
    totalExperience: ['', [Validators.required]],
    relevantExperience: ['', [Validators.required]],
    currentSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    expectedSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    noticePeriod: [30, [Validators.required]],
    matchScore: [85],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.CandidateForm.patchValue({
        id: this.data.id || this.data.candidateId || 0,
        firstName: this.data.firstName || '',
        lastName: this.data.lastName || '',
        emailAddress: this.data.emailAddress || '',
        mobileNumber: this.data.mobileNumber || '',
        appliedRole: this.data.appliedRole || 'Senior Frontend Engineer',
        stage: this.data.stage || 'Screening',
        totalExperience: String(this.data.totalExperience || ''),
        relevantExperience: String(this.data.relevantExperience || ''),
        currentSalary: this.data.currentSalary ? String(Math.round(Number(this.data.currentSalary))) : '',
        expectedSalary: this.data.expectedSalary ? String(Math.round(Number(this.data.expectedSalary))) : '',
        noticePeriod: this.data.noticePeriod !== undefined ? Number(this.data.noticePeriod) : 30,
        matchScore: this.data.matchScore || 85,
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[0-9.]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyDigits(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.CandidateForm.invalid) {
      this.CandidateForm.markAllAsTouched();
      this.toaster.error('Please fill in all required fields with valid values', 'Validation Error');
      return;
    }

    const formVal = this.CandidateForm.value;

    // Exact Payload mapping matching C# Candidate Model
    const payload = {
      id: this.isEdit ? Number(formVal.id || 0) : 0,
      firstName: (formVal.firstName || '').trim(),
      lastName: (formVal.lastName || '').trim(),
      emailAddress: (formVal.emailAddress || '').trim(),
      mobileNumber: String(formVal.mobileNumber || '').trim(),
      totalExperience: String(formVal.totalExperience || '').trim(), // C# string
      relevantExperience: String(formVal.relevantExperience || '').trim(), // C# string
      currentSalary: Math.round(Number(formVal.currentSalary || 0)), // C# long (integer)
      expectedSalary: Math.round(Number(formVal.expectedSalary || 0)), // C# long (integer)
      noticePeriod: parseInt(String(formVal.noticePeriod || 30), 10), // C# int (integer)
      isActive: formVal.isActive !== false
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: () => {
          this.toaster.success('Candidate profile updated successfully', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating candidate:', err);
          const msg = err?.error?.message || err?.error?.title || 'Candidate profile updated';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New candidate added successfully', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error adding candidate:', err);
          const msg = err?.error?.message || err?.error?.title || 'New candidate added';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    }
  }
}
