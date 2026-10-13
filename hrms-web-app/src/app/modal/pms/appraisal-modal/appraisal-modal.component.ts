import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsAppraisalDto, PmsService } from '../../../services/pms/pms.service';
import { RbacService } from '../../../core/rbac.service';

interface CompetencyItem {
  id: string;
  name: string;
  description: string;
  selfScore: number;
  mgrScore: number;
}

@Component({
  selector: 'app-appraisal-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './appraisal-modal.component.html',
  styleUrls: ['./appraisal-modal.component.scss']
})
export class AppraisalModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<AppraisalModalComponent>);
  public data: { appraisalDto: PmsAppraisalDto; roleContext?: 'self' | 'manager' | 'hr' } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  mode: 'self' | 'manager' | 'hr' = 'self';
  currentEmpId: number = 0;

  competencies: CompetencyItem[] = [
    { id: 'quality', name: 'Work Quality & Delivery', description: 'Accuracy, adherence to deadlines, and standard of deliverables', selfScore: 4, mgrScore: 4 },
    { id: 'collab', name: 'Collaboration & Teamwork', description: 'Effective communication, cross-functional synergy, and reliability', selfScore: 4, mgrScore: 4 },
    { id: 'problem_solving', name: 'Problem Solving & Innovation', description: 'Analytical approach, initiative in addressing blockers and creative solutions', selfScore: 4, mgrScore: 4 },
    { id: 'ownership', name: 'Ownership & Accountability', description: 'Taking responsibility for outcomes and continuous learning', selfScore: 4, mgrScore: 4 }
  ];

  selfForm: FormGroup = this.fb.group({
    selfRating: [4.0, [Validators.required, Validators.min(1), Validators.max(5)]],
    selfComments: ['', [Validators.required, Validators.minLength(10)]]
  });

  managerForm: FormGroup = this.fb.group({
    managerRating: [4.0, [Validators.required, Validators.min(1), Validators.max(5)]],
    managerComments: ['', [Validators.required, Validators.minLength(10)]]
  });

  hrForm: FormGroup = this.fb.group({
    finalRating: [4.0, [Validators.required, Validators.min(1), Validators.max(5)]],
    hrComments: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;
    const isHrAdmin = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);

    // Determine initial active mode
    if (this.data.roleContext) {
      this.mode = this.data.roleContext;
    } else {
      const a = this.data.appraisalDto.appraisal;
      if (a.status === 'Pending Self Review' && this.currentEmpId === a.employeeId) {
        this.mode = 'self';
      } else if (a.status === 'Pending Manager Review' && (this.currentEmpId === a.managerId || isHrAdmin)) {
        this.mode = 'manager';
      } else if (isHrAdmin && (a.status === 'Pending HR Review' || a.status === 'Finalized')) {
        this.mode = 'hr';
      } else {
        this.mode = 'self';
      }
    }

    // Populate existing ratings
    const app = this.data.appraisalDto.appraisal;
    if (app.selfRating) {
      this.selfForm.patchValue({
        selfRating: app.selfRating,
        selfComments: app.selfComments || ''
      });
    }
    if (app.managerRating) {
      this.managerForm.patchValue({
        managerRating: app.managerRating,
        managerComments: app.managerComments || ''
      });
    }
    if (app.finalRating) {
      this.hrForm.patchValue({
        finalRating: app.finalRating,
        hrComments: app.hrComments || ''
      });
    }

    // Parse competency ratings JSON if present
    if (app.competencyRatingsJson) {
      try {
        const parsed = JSON.parse(app.competencyRatingsJson);
        if (Array.isArray(parsed)) {
          this.competencies = parsed;
        }
      } catch (e) {
        // fallback to default
      }
    }
  }

  setScore(comp: CompetencyItem, type: 'self' | 'manager', score: number): void {
    if (type === 'self' && this.mode === 'self') {
      comp.selfScore = score;
    } else if (type === 'manager' && this.mode === 'manager') {
      comp.mgrScore = score;
    }
  }

  submitSelf(): void {
    if (this.selfForm.invalid) {
      this.selfForm.markAllAsTouched();
      this.toaster.warning('Please provide self rating and comments');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      appraisalId: this.data.appraisalDto.appraisal.id,
      selfRating: Number(this.selfForm.value.selfRating),
      selfComments: this.selfForm.value.selfComments,
      competencyRatingsJson: JSON.stringify(this.competencies)
    };

    this.pmsService.submitSelfReview(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Self-appraisal submitted to Manager!');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to submit self review');
      }
    });
  }

  submitManager(): void {
    if (this.managerForm.invalid) {
      this.managerForm.markAllAsTouched();
      this.toaster.warning('Please provide manager rating and comments');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      appraisalId: this.data.appraisalDto.appraisal.id,
      managerRating: Number(this.managerForm.value.managerRating),
      managerComments: this.managerForm.value.managerComments,
      competencyRatingsJson: JSON.stringify(this.competencies)
    };

    this.pmsService.submitManagerReview(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Manager evaluation submitted to HR!');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to submit manager review');
      }
    });
  }

  finalizeHr(): void {
    if (this.hrForm.invalid) {
      this.hrForm.markAllAsTouched();
      this.toaster.warning('Please provide final rating and HR comments');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      appraisalId: this.data.appraisalDto.appraisal.id,
      finalRating: Number(this.hrForm.value.finalRating),
      hrComments: this.hrForm.value.hrComments
    };

    this.pmsService.finalizeAppraisal(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('Appraisal finalized and published!');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to finalize appraisal');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
