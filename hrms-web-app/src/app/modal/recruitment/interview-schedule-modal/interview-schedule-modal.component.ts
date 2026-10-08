import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { CandidatePipelineItemDto, JobInterviewDto, RecruitmentService, ScheduleInterviewRequest } from '../../../services/recruitment/recruitment.service';
import { EmployeeService } from '../../../services/employee/employee.service';

export interface RoundOption {
  index: number;
  name: string;
  isCompleted: boolean;
  isScheduled: boolean;
  disabled: boolean;
  badgeText: string;
}

@Component({
  selector: 'app-interview-schedule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './interview-schedule-modal.component.html',
  styleUrls: ['./interview-schedule-modal.component.scss']
})
export class InterviewScheduleModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<InterviewScheduleModalComponent>);
  public data: { candidate: CandidatePipelineItemDto } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  candidate!: CandidatePipelineItemDto;
  employees: any[] = [];
  existingInterviews: JobInterviewDto[] = [];
  activeInterview?: JobInterviewDto;
  hasActiveScheduledInterview = false;

  standardRounds = [
    'Round 1: HR & Initial Screen',
    'Round 2: Technical Interview (Core)',
    'Round 3: System Design & Architecture',
    'Round 4: Leadership & Culture Fit',
    'Final Executive Review'
  ];

  roundOptions: RoundOption[] = [];

  scheduleForm: FormGroup = this.fb.group({
    roundName: ['', Validators.required],
    interviewerId: [null, Validators.required],
    scheduledAt: ['', Validators.required],
    durationMinutes: [45, [Validators.required, Validators.min(15)]],
    meetingLink: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.candidate = this.data.candidate;
    this.loadEmployees();

    // Default datetime to tomorrow 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    const isoStr = tomorrow.toISOString().slice(0, 16);
    this.scheduleForm.patchValue({ scheduledAt: isoStr });

    this.loadCandidateInterviews();
  }

  loadCandidateInterviews(): void {
    this.recruitmentService.getInterviews(this.candidate.id).subscribe({
      next: (interviews) => {
        this.existingInterviews = Array.isArray(interviews) ? interviews : [];
        this.processRoundProgression();
      },
      error: () => {
        this.existingInterviews = this.candidate.interviews || [];
        this.processRoundProgression();
      }
    });
  }

  processRoundProgression(): void {
    // 1. Check for any active scheduled interview (status: Scheduled or Rescheduled)
    this.activeInterview = this.existingInterviews.find(
      (i) => i.status === 'Scheduled' || i.status === 'Rescheduled'
    );
    this.hasActiveScheduledInterview = Boolean(this.activeInterview);

    // 2. Identify completed passed rounds
    const completedPassedMap = new Map<string, JobInterviewDto>();
    this.existingInterviews.forEach((i) => {
      if (i.status === 'Completed' && i.recommendation !== 'Reject') {
        completedPassedMap.set(i.roundName.toLowerCase().trim(), i);
      }
    });

    // 3. Find highest completed round index
    let highestCompletedIdx = -1;
    this.standardRounds.forEach((r, idx) => {
      if (completedPassedMap.has(r.toLowerCase().trim())) {
        highestCompletedIdx = Math.max(highestCompletedIdx, idx);
      }
    });

    // 4. Build round progression options
    this.roundOptions = this.standardRounds.map((r, idx) => {
      const isCompleted = completedPassedMap.has(r.toLowerCase().trim());
      const isScheduled = Boolean(
        this.activeInterview &&
        this.activeInterview.roundName.toLowerCase().trim() === r.toLowerCase().trim()
      );
      const isBackward = idx < highestCompletedIdx;

      let badge = '';
      let disabled = false;

      if (isScheduled) {
        disabled = true;
        badge = '— Currently Scheduled';
      } else if (isCompleted) {
        disabled = true;
        badge = '— Completed (Passed)';
      } else if (isBackward) {
        disabled = true;
        badge = '— Prior Round (Passed)';
      }

      return {
        index: idx + 1,
        name: r,
        isCompleted,
        isScheduled,
        disabled,
        badgeText: badge
      };
    });

    // 5. Select the next eligible round
    const nextEligible = this.roundOptions.find((r) => !r.disabled);
    if (nextEligible) {
      this.scheduleForm.patchValue({ roundName: nextEligible.name });
    } else {
      this.scheduleForm.patchValue({ roundName: this.standardRounds[this.standardRounds.length - 1] });
    }
  }

  loadEmployees(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.data || [];
        this.employees = list.filter((e) => !e.isDeleted);
      },
      error: () => {
        this.employees = [];
      }
    });
  }

  submit(): void {
    if (this.hasActiveScheduledInterview) {
      this.toaster.warning(
        `Candidate already has an active scheduled interview for '${this.activeInterview?.roundName}'. Please evaluate or cancel it first.`,
        'Interview in Progress'
      );
      return;
    }

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.toaster.warning('Please complete all interview details', 'Validation');
      return;
    }

    const selectedRound = this.roundOptions.find((r) => r.name === this.scheduleForm.value.roundName);
    if (selectedRound && selectedRound.disabled) {
      this.toaster.error(
        `Cannot schedule '${selectedRound.name}' ${selectedRound.badgeText}. Please choose the next available progression round.`,
        'Invalid Round'
      );
      return;
    }

    this.isSubmitting = true;
    const req: ScheduleInterviewRequest = {
      candidateId: this.candidate.id,
      jobRequisitionId: this.candidate.jobRequisitionId,
      roundName: this.scheduleForm.value.roundName,
      interviewerId: Number(this.scheduleForm.value.interviewerId),
      scheduledAt: this.scheduleForm.value.scheduledAt,
      durationMinutes: Number(this.scheduleForm.value.durationMinutes),
      meetingLink: this.scheduleForm.value.meetingLink
    };

    this.recruitmentService.scheduleInterview(req).subscribe({
      next: () => {
        this.toaster.success(`Interview round scheduled with candidate ${this.candidate.fullName}`, 'Success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to schedule interview', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
