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
import { EmployeeService } from '../../services/employee/employee.service';
import { RecruitmentService, JobRequisitionDto } from '../../services/recruitment/recruitment.service';

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
  private employeeService = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);
  private toaster = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<CandidateeComponent>);

  isEdit: boolean = false;
  employees: any[] = [];
  requisitionsList: JobRequisitionDto[] = [];

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
    'Offer Accepted',
    'Selected / Hired',
    'Rejected'
  ];

  recommendationOptions: string[] = [
    'Strong Hire / Recommend for Offer',
    'Advance to Next Round',
    'Keep on Hold / Backup Candidate',
    'Reject / Not Suitable'
  ];

  noticePeriodOptions: number[] = [0, 15, 30, 45, 60, 90];

  CandidateForm = this.fb.group({
    id: [0],
    firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    emailAddress: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    jobRequisitionId: [null as number | null],
    appliedRole: ['Senior Frontend Engineer'],
    stage: ['Screening'],
    totalExperience: ['', [Validators.required]],
    relevantExperience: ['', [Validators.required]],
    currentSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    expectedSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    noticePeriod: [30, [Validators.required]],
    matchScore: [85],
    isActive: [true],
    interviewerId: [null as number | null],
    interviewerName: [''],
    interviewerRemarks: [''],
    interviewRating: [4],
    interviewRecommendation: ['Advance to Next Round']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.loadEmployees();
    this.loadRequisitions();

    if (this.data) {
      this.isEdit = Boolean(this.data.id && Number(this.data.id) > 0);
      const initialReqId = this.data.jobRequisitionId ? Number(this.data.jobRequisitionId) : null;
      let relExpYears = String(this.data.totalExperience !== undefined ? (this.data.relevantExperience || '') : '');
      let intId = this.data.interviewerId || null;
      let intName = this.data.interviewerName || '';
      let intRemarks = this.data.interviewerRemarks || '';
      let intRating = this.data.interviewRating || 4;
      let intRec = this.data.interviewRecommendation || 'Advance to Next Round';

      if (typeof this.data.relevantExperience === 'string' && this.data.relevantExperience.startsWith('{')) {
        try {
          const parsed = JSON.parse(this.data.relevantExperience);
          relExpYears = parsed.years || parsed.experience || relExpYears;
          intId = parsed.interviewerId || intId;
          intName = parsed.interviewerName || intName;
          intRemarks = parsed.remarks || parsed.interviewerRemarks || intRemarks;
          intRating = parsed.rating || parsed.interviewRating || intRating;
          intRec = parsed.recommendation || parsed.interviewRecommendation || intRec;
        } catch {}
      }

      this.CandidateForm.patchValue({
        id: this.data.id || this.data.candidateId || 0,
        firstName: this.data.firstName || '',
        lastName: this.data.lastName || '',
        emailAddress: this.data.emailAddress || '',
        mobileNumber: this.data.mobileNumber || '',
        jobRequisitionId: initialReqId,
        appliedRole: this.data.appliedRole || 'Senior Frontend Engineer',
        stage: this.data.stage || 'Screening',
        totalExperience: String(this.data.totalExperience || ''),
        relevantExperience: relExpYears,
        currentSalary: this.data.currentSalary ? String(Math.round(Number(this.data.currentSalary))) : '',
        expectedSalary: this.data.expectedSalary ? String(Math.round(Number(this.data.expectedSalary))) : '',
        noticePeriod: this.data.noticePeriod !== undefined ? Number(this.data.noticePeriod) : 30,
        matchScore: this.data.matchScore || 85,
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true,
        interviewerId: intId,
        interviewerName: intName,
        interviewerRemarks: intRemarks,
        interviewRating: intRating,
        interviewRecommendation: intRec
      });
    }

    this.CandidateForm.get('interviewerId')?.valueChanges.subscribe(id => {
      const found = this.employees.find(e => Number(e.id) === Number(id));
      if (found) {
        const fName = found.firstName || '';
        const lName = found.lastName || '';
        this.CandidateForm.get('interviewerName')?.setValue(`${fName} ${lName}`.trim());
      }
    });
  }

  private loadRequisitions() {
    this.recruitmentService.getAllRequisitions().subscribe({
      next: (res) => {
        const rawList = Array.isArray(res) ? res : [];
        const currentReqId = this.CandidateForm.get('jobRequisitionId')?.value;

        // When adding a new candidate (!this.isEdit):
        // Only include OPEN job openings (exclude Closed, On Hold, Draft).
        // When editing an existing candidate (this.isEdit):
        // Include OPEN job openings, PLUS the candidate's currently assigned opening (if any).
        this.requisitionsList = rawList.filter(r => {
          const isClosed = (r.status || '').toLowerCase() === 'closed';
          if (this.isEdit && currentReqId && Number(r.id) === Number(currentReqId)) {
            return true;
          }
          return !isClosed && (r.status || '').toLowerCase() === 'open';
        });

        if (currentReqId) {
          const found = this.requisitionsList.find(r => Number(r.id) === Number(currentReqId));
          if (found) {
            if (!this.rolesList.includes(found.title)) {
              this.rolesList.unshift(found.title);
            }
            if (!this.isEdit) {
              this.CandidateForm.patchValue({ appliedRole: found.title });
            }
          } else if (!this.isEdit) {
            // Target opening was closed, so reset to general applicant
            this.CandidateForm.patchValue({ jobRequisitionId: null });
          }
        }
      },
      error: () => {
        this.requisitionsList = [];
      }
    });
  }

  onJobRequisitionChange() {
    const reqId = this.CandidateForm.get('jobRequisitionId')?.value;
    if (reqId) {
      const selected = this.requisitionsList.find(r => Number(r.id) === Number(reqId));
      if (selected) {
        if (!this.rolesList.includes(selected.title)) {
          this.rolesList.unshift(selected.title);
        }
        this.CandidateForm.patchValue({
          appliedRole: selected.title
        });
      }
    }
  }

  private loadEmployees() {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        this.employees = list.filter((e: any) => !e.isDeleted && e.isActive !== false);
      },
      error: () => {
        this.employees = [];
      }
    });
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

    if (!this.isEdit && formVal.jobRequisitionId) {
      const selReq = this.requisitionsList.find(r => Number(r.id) === Number(formVal.jobRequisitionId));
      if (selReq && (selReq.status || '').toLowerCase() === 'closed') {
        this.toaster.error('Selected job opening is closed. Candidates cannot be added to closed requisitions.', 'Opening Closed');
        return;
      }
    }

    const isoDate = new Date().toISOString();

    let relExpValue = String(formVal.relevantExperience || '').trim();
    if (formVal.interviewerId || (formVal.interviewerRemarks && formVal.interviewerRemarks.trim())) {
      relExpValue = JSON.stringify({
        years: relExpValue || '0',
        interviewerId: formVal.interviewerId ? Number(formVal.interviewerId) : null,
        interviewerName: formVal.interviewerName || '',
        remarks: (formVal.interviewerRemarks || '').trim(),
        rating: Number(formVal.interviewRating || 4),
        recommendation: formVal.interviewRecommendation || 'Advance to Next Round',
        evaluationDate: new Date().toISOString()
      });
    }

    // Exact Payload mapping matching C# Candidate Model
    const payload: any = {
      id: this.isEdit ? Number(formVal.id || 0) : 0,
      candidateId: this.isEdit ? Number(formVal.id || 0) : 0,
      firstName: (formVal.firstName || '').trim(),
      lastName: (formVal.lastName || '').trim(),
      emailAddress: (formVal.emailAddress || '').trim(),
      mobileNumber: String(formVal.mobileNumber || '').trim(),
      appliedRole: formVal.appliedRole || 'Senior Frontend Engineer',
      jobRequisitionId: formVal.jobRequisitionId ? Number(formVal.jobRequisitionId) : null,
      stage: formVal.stage || 'Screening',
      totalExperience: String(formVal.totalExperience || '').trim(),
      relevantExperience: relExpValue,
      currentSalary: Math.round(parseFloat(String(formVal.currentSalary || '').replace(/[^0-9.]/g, '')) || 1200000),
      expectedSalary: Math.round(parseFloat(String(formVal.expectedSalary || '').replace(/[^0-9.]/g, '')) || 1400000),
      noticePeriod: parseInt(String(formVal.noticePeriod || 30), 10),
      matchScore: Number(formVal.matchScore || 85),
      lastUpdated: isoDate,
      LastUpdated: isoDate,
      isActive: formVal.isActive !== false
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Candidate profile updated successfully', 'Updated');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to update candidate profile', 'Error');
          }
        },
        error: (err) => {
          console.error('Error updating candidate:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || err?.error?.title || 'Error updating candidate';
          this.toaster.error(msg, 'Update Error');
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('New candidate added successfully', 'Created');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to add new candidate', 'Error');
          }
        },
        error: (err) => {
          console.error('Error adding candidate:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || err?.error?.title || 'Error adding candidate';
          this.toaster.error(msg, 'Creation Error');
        }
      });
    }
  }
}
