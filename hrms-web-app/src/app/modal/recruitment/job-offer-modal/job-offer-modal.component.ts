import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { CandidatePipelineItemDto, CreateJobOfferRequest, RecruitmentService } from '../../../services/recruitment/recruitment.service';

@Component({
  selector: 'app-job-offer-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './job-offer-modal.component.html',
  styleUrls: ['./job-offer-modal.component.scss']
})
export class JobOfferModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<JobOfferModalComponent>);
  public data: { candidate: CandidatePipelineItemDto } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private toaster = inject(ToastrService);

  candidate!: CandidatePipelineItemDto;
  isSubmitting = false;

  offerForm: FormGroup = this.fb.group({
    designation: ['', [Validators.required, Validators.maxLength(150)]],
    offeredCtc: [null, [Validators.required, Validators.min(100000)]],
    joiningDate: ['', Validators.required],
    expiryDate: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.candidate = this.data.candidate;

    // Default dates: joining in 30 days, expiry in 7 days
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() + 30);

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 7);

    this.offerForm.patchValue({
      designation: this.candidate.appliedRole || 'Software Engineer',
      offeredCtc: this.candidate.expectedSalary || 1200000,
      joiningDate: joinDate.toISOString().split('T')[0],
      expiryDate: expDate.toISOString().split('T')[0]
    });
  }

  submit(): void {
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      this.toaster.warning('Please enter valid offer details', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: CreateJobOfferRequest = {
      candidateId: this.candidate.id,
      jobRequisitionId: this.candidate.jobRequisitionId,
      designation: this.offerForm.value.designation,
      offeredCtc: Number(this.offerForm.value.offeredCtc),
      joiningDate: this.offerForm.value.joiningDate,
      expiryDate: this.offerForm.value.expiryDate || undefined,
      notes: this.offerForm.value.notes
    };

    this.recruitmentService.createOffer(req).subscribe({
      next: () => {
        this.toaster.success(`Offer letter released for ${this.candidate.fullName}`, 'Success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Failed to release offer', 'Error');
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
