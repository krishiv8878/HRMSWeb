import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { JobInterviewDto, RecruitmentService, SubmitInterviewFeedbackRequest } from '../../../services/recruitment/recruitment.service';

@Component({
  selector: 'app-interview-scorecard-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './interview-scorecard-modal.component.html',
  styleUrls: ['./interview-scorecard-modal.component.scss']
})
export class InterviewScorecardModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<InterviewScorecardModalComponent>);
  public data: { interview: JobInterviewDto } = inject(MAT_DIALOG_DATA);
  private recruitmentService = inject(RecruitmentService);
  private toaster = inject(ToastrService);

  interview!: JobInterviewDto;
  isSubmitting = false;

  rating: number = 4;
  recommendation: string = 'Hire';
  feedbackNotes: string = '';
  advanceToNextStage: boolean = false;

  stars = [1, 2, 3, 4, 5];

  recommendations = [
    { value: 'Strong Hire', label: 'Strong Hire (Exceeds Bar)', color: 'emerald' },
    { value: 'Hire', label: 'Hire (Meets Expectations)', color: 'blue' },
    { value: 'Borderline', label: 'Borderline / Needs Follow-up', color: 'amber' },
    { value: 'Reject', label: 'Reject (Does Not Meet Bar)', color: 'rose' }
  ];

  ngOnInit(): void {
    this.interview = this.data.interview;
    if (this.interview.rating) this.rating = this.interview.rating;
    if (this.interview.recommendation) this.recommendation = this.interview.recommendation;
    if (this.interview.feedbackNotes) this.feedbackNotes = this.interview.feedbackNotes;
  }

  setRating(val: number): void {
    this.rating = val;
  }

  submit(): void {
    if (!this.feedbackNotes.trim()) {
      this.toaster.warning('Please provide evaluation comments or scorecard notes', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: SubmitInterviewFeedbackRequest = {
      interviewId: this.interview.id,
      rating: this.rating,
      recommendation: this.recommendation,
      feedbackNotes: this.feedbackNotes,
      advanceToNextStage: this.advanceToNextStage
    };

    this.recruitmentService.submitInterviewFeedback(req).subscribe({
      next: () => {
        this.toaster.success('Interview evaluation & scorecard submitted', 'Success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to submit scorecard', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
