import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsService } from '../../../services/pms/pms.service';
import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './feedback-modal.component.html',
  styleUrls: ['./feedback-modal.component.scss']
})
export class FeedbackModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<FeedbackModalComponent>);
  public data: { toEmployeeId?: number } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  allEmployees: any[] = [];
  currentEmpId: number = 0;

  badges = [
    { name: 'Team Player', icon: 'diversity_3', color: '#3b82f6', desc: 'Fosters collaboration & helps peers succeed' },
    { name: 'Star Performer', icon: 'military_tech', color: '#eab308', desc: 'Delivers exceptional impact & high standard' },
    { name: 'Innovator', icon: 'lightbulb', color: '#ec4899', desc: 'Brings creative solutions & fresh thinking' },
    { name: 'Fast Learner', icon: 'rocket_launch', color: '#8b5cf6', desc: 'Quickly masters new tools & challenges' },
    { name: 'Goal Crusher', icon: 'crisis_alert', color: '#10b981', desc: 'Exceeds milestones ahead of schedule' },
    { name: 'Customer Champion', icon: 'sentiment_very_satisfied', color: '#06b6d4', desc: 'Puts user satisfaction first' }
  ];

  feedbackForm: FormGroup = this.fb.group({
    toEmployeeId: [null, [Validators.required]],
    feedbackType: ['Praise', [Validators.required]],
    badge: ['Team Player', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    isPrivate: [false]
  });

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;

    this.employeeService.getLookup().subscribe({
      next: (res: any) => {
        this.allEmployees = (res?.data || res || []).filter((e: any) => !e.isDelete && e.id !== this.currentEmpId);
      },
      error: () => {}
    });

    if (this.data?.toEmployeeId) {
      this.feedbackForm.patchValue({ toEmployeeId: this.data.toEmployeeId });
    }
  }

  selectBadge(bName: string): void {
    this.feedbackForm.patchValue({ badge: bName });
  }

  onSubmit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.toaster.warning('Please select a recipient, badge, and write a message');
      return;
    }

    this.isSubmitting = true;
    const val = this.feedbackForm.value;
    const payload = {
      toEmployeeId: Number(val.toEmployeeId),
      feedbackType: val.feedbackType,
      badge: val.badge,
      message: val.message,
      isPrivate: Boolean(val.isPrivate)
    };

    this.pmsService.giveFeedback(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Kudos & Feedback sent successfully! 🎉');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to submit feedback');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
