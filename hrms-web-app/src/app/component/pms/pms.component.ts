import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  PmsAppraisalDto,
  PmsFeedbackDto,
  PmsGoalDto,
  PmsOneOnOneDto,
  PmsPipDto,
  PmsReviewCycle,
  PmsService
} from '../../services/pms/pms.service';
import { RbacService } from '../../core/rbac.service';
import { GoalModalComponent } from '../../modal/pms/goal-modal/goal-modal.component';
import { CheckinModalComponent } from '../../modal/pms/checkin-modal/checkin-modal.component';
import { AppraisalModalComponent } from '../../modal/pms/appraisal-modal/appraisal-modal.component';
import { FeedbackModalComponent } from '../../modal/pms/feedback-modal/feedback-modal.component';
import { OneOnOneModalComponent } from '../../modal/pms/one-on-one-modal/one-on-one-modal.component';
import { CycleModalComponent } from '../../modal/pms/cycle-modal/cycle-modal.component';
import { PipModalComponent } from '../../modal/pms/pip-modal/pip-modal.component';

@Component({
  selector: 'app-pms',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './pms.component.html',
  styleUrls: ['./pms.component.scss']
})
export class PmsComponent implements OnInit {
  private pmsService = inject(PmsService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  public rbacService = inject(RbacService);

  activeTab: 'goals' | 'reviews' | 'feedback' | 'oneonone' | 'pip' = 'goals';

  isLoading = false;
  currentEmpId: number = 0;
  isAdminOrHr = false;
  isManager = false;

  // 1. Goals State
  goals: PmsGoalDto[] = [];
  selectedPeriod: string = 'All';
  selectedCategory: string = 'All';
  searchQuery: string = '';
  periods: string[] = ['All', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Annual 2026'];
  categories: string[] = ['All', 'Individual', 'Department', 'Company'];

  // 2. Reviews State
  cycles: PmsReviewCycle[] = [];
  selectedCycleId: number | null = null;
  appraisals: PmsAppraisalDto[] = [];

  // 3. Feedback State
  feedbacks: PmsFeedbackDto[] = [];
  feedbackFilter: string = 'All';

  // 4. 1-on-1 State
  oneOnOnes: PmsOneOnOneDto[] = [];

  // 5. PIP State
  pips: PmsPipDto[] = [];

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;
    this.isAdminOrHr = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);
    this.isManager = this.rbacService.hasAnyRole(['Manager', 'Management', 'Admin', 'System Admin', 'HR']);

    this.loadGoals();
    this.loadReviewCycles();
    this.loadFeedback();
    this.loadOneOnOnes();
    this.loadPips();
  }

  setTab(tab: 'goals' | 'reviews' | 'feedback' | 'oneonone' | 'pip'): void {
    this.activeTab = tab;
  }

  // 1. GOALS METHODS
  loadGoals(): void {
    this.isLoading = true;
    const period = this.selectedPeriod !== 'All' ? this.selectedPeriod : undefined;
    const cat = this.selectedCategory !== 'All' ? this.selectedCategory : undefined;
    const empId = (this.isAdminOrHr || this.isManager) ? undefined : this.currentEmpId;

    this.pmsService.getGoals(empId, period, cat).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.goals = res?.data || [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get filteredGoals(): PmsGoalDto[] {
    return this.goals.filter(g => {
      const q = this.searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        g.goal.title.toLowerCase().includes(q) ||
        (g.employeeName && g.employeeName.toLowerCase().includes(q)) ||
        (g.goal.department && g.goal.department.toLowerCase().includes(q));
      return matchesSearch;
    });
  }

  get totalGoalsCount(): number { return this.goals.length; }
  get completedGoalsCount(): number { return this.goals.filter(g => g.goal.status === 'Completed').length; }
  get onTrackGoalsCount(): number { return this.goals.filter(g => g.goal.status === 'On Track').length; }
  get atRiskGoalsCount(): number { return this.goals.filter(g => g.goal.status === 'At Risk' || g.goal.status === 'Behind').length; }

  get avgGoalProgress(): number {
    if (this.goals.length === 0) return 0;
    const sum = this.goals.reduce((acc, curr) => acc + (curr.goal.progressPercentage || 0), 0);
    return Math.round(sum / this.goals.length);
  }

  openGoalModal(goalDto?: PmsGoalDto): void {
    const dialogRef = this.dialog.open(GoalModalComponent, {
      width: '780px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { goalDto, employeeId: this.currentEmpId }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadGoals();
    });
  }

  openCheckinModal(goalDto: PmsGoalDto, keyResultId?: number): void {
    const dialogRef = this.dialog.open(CheckinModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { goalDto, selectedKeyResultId: keyResultId }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadGoals();
    });
  }

  deleteGoal(id: number): void {
    if (confirm('Are you sure you want to delete this Goal and all associated Key Results?')) {
      this.pmsService.deleteGoal(id).subscribe({
        next: () => {
          this.toaster.success('Goal deleted successfully');
          this.loadGoals();
        },
        error: (err) => {
          this.toaster.error(err?.error?.message || 'Failed to delete goal');
        }
      });
    }
  }

  // 2. REVIEWS METHODS
  loadReviewCycles(): void {
    this.pmsService.getReviewCycles().subscribe({
      next: (res) => {
        this.cycles = res?.data || [];
        if (this.cycles.length > 0 && !this.selectedCycleId) {
          this.selectedCycleId = this.cycles[0].id;
        }
        this.loadAppraisals();
      },
      error: () => {}
    });
  }

  onCycleChange(): void {
    this.loadAppraisals();
  }

  loadAppraisals(): void {
    const cycleId = this.selectedCycleId || undefined;
    const empId = (this.isAdminOrHr || this.isManager) ? undefined : this.currentEmpId;

    this.pmsService.getAppraisals(cycleId, empId).subscribe({
      next: (res) => {
        this.appraisals = res?.data || [];
      },
      error: () => {}
    });
  }

  openCycleModal(): void {
    const dialogRef = this.dialog.open(CycleModalComponent, {
      width: '650px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadReviewCycles();
    });
  }

  openAppraisalModal(appraisalDto: PmsAppraisalDto): void {
    const dialogRef = this.dialog.open(AppraisalModalComponent, {
      width: '840px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { appraisalDto }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadAppraisals();
    });
  }

  // 3. CONTINUOUS FEEDBACK METHODS
  loadFeedback(): void {
    const type = this.feedbackFilter !== 'All' ? this.feedbackFilter : undefined;
    this.pmsService.getFeedback(undefined, type).subscribe({
      next: (res) => {
        this.feedbacks = res?.data || [];
      },
      error: () => {}
    });
  }

  openFeedbackModal(toEmployeeId?: number): void {
    const dialogRef = this.dialog.open(FeedbackModalComponent, {
      width: '660px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { toEmployeeId }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadFeedback();
    });
  }

  // 4. 1-ON-1 METHODS
  loadOneOnOnes(): void {
    const mgrId = this.isManager && !this.isAdminOrHr ? this.currentEmpId : undefined;
    const empId = !this.isManager && !this.isAdminOrHr ? this.currentEmpId : undefined;

    this.pmsService.getOneOnOnes(mgrId, empId).subscribe({
      next: (res) => {
        this.oneOnOnes = res?.data || [];
      },
      error: () => {}
    });
  }

  openOneOnOneModal(oneOnOneDto?: PmsOneOnOneDto): void {
    const dialogRef = this.dialog.open(OneOnOneModalComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { oneOnOneDto }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadOneOnOnes();
    });
  }

  parseJsonArray(jsonStr?: string): any[] {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // 5. PIP METHODS
  loadPips(): void {
    const empId = (this.isAdminOrHr || this.isManager) ? undefined : this.currentEmpId;
    this.pmsService.getPips(empId).subscribe({
      next: (res) => {
        this.pips = res?.data || [];
      },
      error: () => {}
    });
  }

  openPipModal(pipDto?: PmsPipDto): void {
    const dialogRef = this.dialog.open(PipModalComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'custom-clean-dialog',
      data: { pipDto }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadPips();
    });
  }
}
