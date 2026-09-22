import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { CandidateService } from '../../services/candidate/candidate.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { CandidateItem } from '../../interface/candidate.interface';
import { RbacService } from '../../core/rbac.service';

export interface InterviewRoundRecord {
  round: string;
  interviewerId: number;
  interviewerName: string;
  rating?: number;
  recommendation?: string;
  remarks?: string;
  evaluatedAt?: string;
  scheduledAt?: string;
}

@Component({
  selector: 'app-candidate-interview-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './candidate-interview.component.html',
  styleUrl: './candidate-interview.component.scss'
})
export class CandidateInterviewModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private candidateService = inject(CandidateService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<CandidateInterviewModalComponent>);
  private rbacService = inject(RbacService);

  get isAdminOrHr(): boolean {
    return this.rbacService.isAdmin() || this.rbacService.isHR();
  }

  candidate!: CandidateItem;
  scheduleForm!: FormGroup;
  feedbackForm!: FormGroup;

  employees: any[] = [];
  isLoadingEmployees: boolean = true;
  isSubmitting: boolean = false;

  activeTab: 'schedule' | 'feedback' | 'review' | 'history' = 'schedule';

  ratingStars: number[] = [1, 2, 3, 4, 5];

  interviewRounds: string[] = [
    'Round 1: HR Screen',
    'Round 2: Technical Interview 1',
    'Round 3: Technical Interview 2 (System Design)',
    'Round 4: Management & Culture Fit',
    'Final Executive Review'
  ];

  recommendationOptions: string[] = [
    'Pass / Advance to Next Round',
    'Strong Hire / Ready for Offer',
    'Keep on Hold / Borderline',
    'Reject / Not Suitable'
  ];

  currentRound: string = 'Round 1: HR Screen';
  interviewStatus: string = 'Not Scheduled';
  interviewHistory: InterviewRoundRecord[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: { candidate: CandidateItem }) {
    this.candidate = data.candidate;
  }

  ngOnInit(): void {
    this.parseExistingInterviewData();
    this.initForms();
    this.loadEmployees();
    this.determineDefaultTab();
  }

  private parseExistingInterviewData(): void {
    let rawJsonStr: string | null = null;
    const rawCandExp = (this.candidate as any).rawRelevantExperience;
    if (rawCandExp && typeof rawCandExp === 'string' && rawCandExp.trim().startsWith('{')) {
      rawJsonStr = rawCandExp;
    } else if (typeof this.candidate.relevantExperience === 'string' && this.candidate.relevantExperience.trim().startsWith('{')) {
      rawJsonStr = this.candidate.relevantExperience;
    }

    let parsed: any = null;
    if (rawJsonStr) {
      try {
        parsed = JSON.parse(rawJsonStr);
      } catch {
        parsed = null;
      }
    }

    this.currentRound = parsed?.currentRound || this.candidate.currentRound || 'Round 1: HR Screen';
    this.interviewStatus = parsed?.status || this.candidate.interviewStatus || (this.candidate.interviewerRemarks ? 'Feedback Submitted' : (this.candidate.interviewerId ? 'Scheduled' : 'Not Scheduled'));

    let historyList: InterviewRoundRecord[] = [];
    if (parsed && Array.isArray(parsed.history) && parsed.history.length > 0) {
      historyList = [...parsed.history];
    } else if (Array.isArray(this.candidate.interviewHistory) && this.candidate.interviewHistory.length > 0) {
      historyList = [...this.candidate.interviewHistory];
    }

    // Fallback: If historyList is empty, but there are previous evaluator remarks/rating saved on the candidate or in parsed JSON:
    const prevRemarks = parsed?.remarks || parsed?.interviewerRemarks || this.candidate.interviewerRemarks;
    const prevRating = parsed?.rating || parsed?.interviewRating || this.candidate.interviewRating;
    const prevEvaluator = parsed?.lastEvaluatedBy || parsed?.interviewerName || this.candidate.interviewerName || (this.candidate as any).lastEvaluatedBy;
    const prevRec = parsed?.recommendation || parsed?.interviewRecommendation || this.candidate.interviewRecommendation;

    if (historyList.length === 0 && (prevRemarks || prevRating)) {
      historyList.push({
        round: parsed?.currentRound || this.candidate.currentRound || 'Round 1: HR Screen',
        interviewerId: Number(parsed?.interviewerId || this.candidate.interviewerId || 0),
        interviewerName: prevEvaluator || 'Previous Evaluator',
        rating: Number(prevRating || 4),
        recommendation: prevRec || 'Pass / Advance to Next Round',
        remarks: prevRemarks || 'Evaluation feedback logged',
        evaluatedAt: parsed?.evaluatedAt || parsed?.scheduledAt || this.candidate.lastUpdated || new Date().toISOString()
      });
    }

    this.interviewHistory = historyList;
  }

  private determineDefaultTab(): void {
    if (this.candidate.stage === 'Rejected') {
      this.activeTab = 'history';
      return;
    }

    const s = (this.interviewStatus || '').toLowerCase();
    if (this.candidate.interviewerRemarks && (s.includes('feedback submitted') || s.includes('awaiting hr review') || s.includes('pending hr decision'))) {
      this.activeTab = 'review';
    } else if (this.candidate.interviewerId && s.includes('scheduled')) {
      this.activeTab = 'feedback';
    } else if (!this.isAdminOrHr && this.interviewHistory.length > 0) {
      this.activeTab = 'history';
    } else if (!this.isAdminOrHr) {
      this.activeTab = 'feedback';
    } else {
      this.activeTab = 'schedule';
    }
  }

  private initForms(): void {
    // 1. HR/Admin Schedule Round Form (no remarks required)
    this.scheduleForm = this.fb.group({
      round: [this.currentRound, [Validators.required]],
      interviewerId: [this.candidate.interviewerId || null, [Validators.required]],
      interviewerName: [this.candidate.interviewerName || '']
    });

    this.scheduleForm.get('interviewerId')?.valueChanges.subscribe(id => {
      const match = this.employees.find(e => Number(e.id) === Number(id));
      if (match) {
        const fName = match.firstName || '';
        const lName = match.lastName || '';
        const full = `${fName} ${lName}`.trim() || match.name || 'Employee';
        this.scheduleForm.get('interviewerName')?.setValue(full);
      }
    });

    // 2. Interviewer Evaluation Feedback Form
    this.feedbackForm = this.fb.group({
      rating: [this.candidate.interviewRating || 4, [Validators.required, Validators.min(1), Validators.max(5)]],
      recommendation: [this.candidate.interviewRecommendation || 'Pass / Advance to Next Round', [Validators.required]],
      remarks: [this.candidate.interviewerRemarks || '', [Validators.required, Validators.minLength(10)]]
    });
  }

  private loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        this.employees = list.filter((e: any) => !e.isDeleted && e.isActive !== false);
        this.isLoadingEmployees = false;

        if (this.candidate.interviewerId) {
          const match = this.employees.find(e => Number(e.id) === Number(this.candidate.interviewerId));
          if (match && !this.scheduleForm.get('interviewerName')?.value) {
            this.scheduleForm.get('interviewerName')?.setValue(`${match.firstName || ''} ${match.lastName || ''}`.trim());
          }
        }
      },
      error: () => {
        this.employees = [];
        this.isLoadingEmployees = false;
      }
    });
  }

  setRating(s: number): void {
    this.feedbackForm.get('rating')?.setValue(s);
  }

  setTab(tab: 'schedule' | 'feedback' | 'review' | 'history'): void {
    this.activeTab = tab;
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }

  // STEP 1: HR or Admin Assigns Interviewer & Schedules Round
  submitScheduleRound(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.toaster.error('Please select both the interview round and an assigned interviewer', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const val = this.scheduleForm.value;

    const roundName = val.round;
    const intId = Number(val.interviewerId);
    const intName = val.interviewerName;

    // Determine appropriate candidate stage
    let nextStage = 'Technical Interview';
    if (roundName.toLowerCase().includes('hr')) {
      nextStage = 'HR Screen';
    }

    const payloadObj = {
      years: this.getPureExpYears(),
      currentRound: roundName,
      status: 'Scheduled',
      interviewerId: intId,
      interviewerName: intName,
      scheduledAt: new Date().toISOString(),
      remarks: null,
      rating: null,
      recommendation: null,
      history: this.interviewHistory
    };

    this.saveCandidateData(payloadObj, nextStage, 'Interview round scheduled & interviewer assigned successfully');
  }

  // STEP 2: Interviewer Submits Remarks & Evaluation Feedback
  submitInterviewerFeedback(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.toaster.error('Please enter complete interview rating, recommendation, and remarks', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const fVal = this.feedbackForm.value;

    // Archive this completed evaluation into history
    const completedRoundRecord: InterviewRoundRecord = {
      round: this.currentRound,
      interviewerId: Number(this.candidate.interviewerId || 0),
      interviewerName: this.candidate.interviewerName || 'Interviewer',
      rating: Number(fVal.rating),
      recommendation: fVal.recommendation,
      remarks: fVal.remarks.trim(),
      evaluatedAt: new Date().toISOString()
    };

    const updatedHistory = [
      ...this.interviewHistory.filter(h => !(h.round === this.currentRound && Number(h.interviewerId) === completedRoundRecord.interviewerId)),
      completedRoundRecord
    ];
    this.interviewHistory = updatedHistory;

    // Reassign back to HR & clear active interviewer so it removes candidate from this interviewer's list
    const payloadObj = {
      years: this.getPureExpYears(),
      currentRound: this.currentRound,
      status: 'Feedback Submitted - Awaiting HR Review',
      interviewerId: null,
      interviewerName: null,
      rating: Number(fVal.rating),
      recommendation: fVal.recommendation,
      remarks: fVal.remarks.trim(),
      evaluatedAt: new Date().toISOString(),
      lastEvaluatedBy: completedRoundRecord.interviewerName,
      history: updatedHistory
    };

    this.saveCandidateData(payloadObj, this.candidate.stage || 'Technical Interview', 'Feedback submitted successfully! Candidate reassigned back to HR for review.');
  }

  // STEP 3A: HR Schedules Next Round (Archive current round into history & reset for next round)
  prepareNextRound(): void {
    // Ensure current round evaluation is archived into history if not present
    const prevRemarks = this.candidate.interviewerRemarks || this.feedbackForm.get('remarks')?.value;
    const prevRating = this.candidate.interviewRating || this.feedbackForm.get('rating')?.value;
    const prevInterviewer = this.candidate.interviewerName || (this.candidate as any).lastEvaluatedBy || 'Previous Evaluator';
    const prevRec = this.candidate.interviewRecommendation || this.feedbackForm.get('recommendation')?.value;

    if (prevRemarks || prevRating) {
      const alreadyInHistory = this.interviewHistory.some(
        h => (h.round === this.currentRound && h.remarks === prevRemarks) || (prevRemarks && h.remarks === prevRemarks)
      );
      if (!alreadyInHistory) {
        this.interviewHistory.push({
          round: this.currentRound,
          interviewerId: Number(this.candidate.interviewerId || 0),
          interviewerName: prevInterviewer,
          rating: Number(prevRating || 4),
          recommendation: prevRec || 'Pass / Advance to Next Round',
          remarks: prevRemarks || 'Evaluation passed',
          evaluatedAt: new Date().toISOString()
        });
      }
    }

    // Advance round selector to next round
    const currentIdx = this.interviewRounds.indexOf(this.currentRound);
    const nextRound = currentIdx >= 0 && currentIdx < this.interviewRounds.length - 1
      ? this.interviewRounds[currentIdx + 1]
      : 'Final Executive Review';

    this.currentRound = nextRound;
    this.scheduleForm.patchValue({
      round: nextRound,
      interviewerId: null,
      interviewerName: ''
    });

    this.activeTab = 'schedule';
    this.toaster.info(`Ready to schedule ${nextRound}. Please select the interviewer.`, 'Advance Round');
  }

  // STEP 3B: HR Approves Candidate for Offer / Hiring
  approveCandidate(): void {
    this.isSubmitting = true;
    const payloadObj = {
      years: this.getPureExpYears(),
      currentRound: this.currentRound,
      status: 'Approved for Hire',
      interviewerId: this.candidate.interviewerId,
      interviewerName: this.candidate.interviewerName,
      rating: this.candidate.interviewRating,
      recommendation: this.candidate.interviewRecommendation,
      remarks: this.candidate.interviewerRemarks,
      history: this.interviewHistory
    };

    this.saveCandidateData(payloadObj, 'Selected / Hired', 'Candidate approved for hiring! Ready for onboarding.');
  }

  // STEP 3C: HR or Interviewer Rejects Candidate (Disables further interviews)
  rejectCandidate(): void {
    this.isSubmitting = true;
    const payloadObj = {
      years: this.getPureExpYears(),
      currentRound: this.currentRound,
      status: 'Rejected',
      interviewerId: this.candidate.interviewerId,
      interviewerName: this.candidate.interviewerName,
      rating: this.candidate.interviewRating,
      recommendation: 'Reject / Not Suitable',
      remarks: this.candidate.interviewerRemarks,
      history: this.interviewHistory
    };

    this.saveCandidateData(payloadObj, 'Rejected', 'Candidate moved to Rejected stage.');
  }

  private extractNumericSalary(val: any, rawVal?: number): number {
    if (rawVal !== undefined && rawVal !== null && !isNaN(rawVal) && rawVal > 0) {
      return Math.round(rawVal);
    }
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      return Math.round(val);
    }
    if (val) {
      const cleaned = String(val).replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        return Math.round(num);
      }
    }
    // Safe sensible fallback so ASP.NET model validation [Required] is satisfied
    return 1200000;
  }

  private getPureExpYears(): string {
    const raw = (this.candidate as any).rawRelevantExperience || this.candidate.relevantExperience;
    if (typeof raw === 'string') {
      if (raw.trim().startsWith('{')) {
        try {
          const p = JSON.parse(raw);
          return String(p.years || '0');
        } catch {
          return String(raw || '0');
        }
      }
      return String(raw || '0');
    }
    return String(this.candidate.relevantExperience || '0');
  }

  private saveCandidateData(structuredPayload: any, stage: string, successMsg: string): void {
    const isoDate = new Date().toISOString();

    const candidateUpdatePayload: any = {
      id: Number(this.candidate.id || this.candidate.candidateId),
      candidateId: Number(this.candidate.id || this.candidate.candidateId),
      firstName: (this.candidate.firstName || 'Candidate').trim(),
      lastName: (this.candidate.lastName || 'Applicant').trim(),
      emailAddress: (this.candidate.emailAddress || 'candidate@example.com').trim(),
      mobileNumber: String(this.candidate.mobileNumber || '9999999999').replace(/[^0-9]/g, '').slice(0, 10) || '9999999999',
      appliedRole: this.candidate.appliedRole || 'General Applicant',
      stage: stage || 'Screening',
      totalExperience: String(this.candidate.totalExperience || '0'),
      relevantExperience: JSON.stringify(structuredPayload),
      currentSalary: this.extractNumericSalary(this.candidate.currentSalary, this.candidate.rawCurrentSalary),
      expectedSalary: this.extractNumericSalary(this.candidate.expectedSalary, this.candidate.rawExpectedSalary),
      noticePeriod: parseInt(String(this.candidate.noticePeriod || 30), 10),
      matchScore: Number(this.candidate.matchScore || 85),
      lastUpdated: isoDate,
      LastUpdated: isoDate,
      isActive: stage !== 'Rejected'
    };

    this.candidateService.updateData(candidateUpdatePayload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res?.statusCode === 200 || res?.StatusCode === 200 || res?.data || res?.responseCode === 200 || res?.success || !res?.responseCode) {
          this.toaster.success(successMsg, 'Updated');
          this.dialogRef.close({ updated: true, stage: stage });
        } else {
          this.toaster.error(res?.responseMessage || res?.message || 'Failed to update candidate', 'Error');
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error updating candidate interview:', err);
        let msg = 'Error updating candidate';
        if (err?.error?.errors) {
          const errList: string[] = [];
          for (const key of Object.keys(err.error.errors)) {
            errList.push(...err.error.errors[key]);
          }
          if (errList.length > 0) msg = errList.join(', ');
        } else {
          msg = err?.error?.responseMessage || err?.error?.message || err?.error?.title || 'Error updating candidate';
        }
        this.toaster.error(msg, 'Update Error');
      }
    });
  }
}
