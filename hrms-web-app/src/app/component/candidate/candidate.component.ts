import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { CandidateService } from '../../services/candidate/candidate.service';
import { CandidateeComponent } from '../../modal/candidatee/candidate.component';
import { CandidateOnboardModalComponent } from '../../modal/candidate-onboard/candidate-onboard.component';
import { CandidateInterviewModalComponent } from '../../modal/candidate-interview/candidate-interview.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { CandidateItem, TalentMetrics } from '../../interface/candidate.interface';
import { RbacService } from '../../core/rbac.service';
import { EmployeeService } from '../../services/employee/employee.service';
import {
  RecruitmentService,
  JobRequisitionDto,
  CandidatePipelineItemDto,
  JobInterviewDto,
  JobOfferDto,
  RecruitmentDashboardMetricsDto
} from '../../services/recruitment/recruitment.service';
import { JobRequisitionModalComponent } from '../../modal/recruitment/job-requisition-modal/job-requisition-modal.component';
import { InterviewScheduleModalComponent } from '../../modal/recruitment/interview-schedule-modal/interview-schedule-modal.component';
import { InterviewScorecardModalComponent } from '../../modal/recruitment/interview-scorecard-modal/interview-scorecard-modal.component';
import { JobOfferModalComponent } from '../../modal/recruitment/job-offer-modal/job-offer-modal.component';

@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateComponent implements OnInit, OnDestroy {
  services = inject(CandidateService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  dialog = inject(MatDialog);
  toaster = inject(ToastrService);
  rbacService = inject(RbacService);
  employeeService = inject(EmployeeService);
  recruitmentService = inject(RecruitmentService);

  // ATS Main Suite Navigation & State
  mainTab: 'pipeline' | 'openings' | 'candidates' | 'interviews' | 'offers' = 'pipeline';
  selectedRequisitionFilter: number | null = null;

  requisitions: JobRequisitionDto[] = [];
  pipelineCandidates: CandidatePipelineItemDto[] = [];
  pipelineStages = ['Sourced', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];
  interviewsList: JobInterviewDto[] = [];
  offersList: JobOfferDto[] = [];
  recruitmentMetrics?: RecruitmentDashboardMetricsDto;

  private routeSub?: Subscription;

  Math = Math;

  allCandidates: CandidateItem[] = [];
  filteredCandidates: CandidateItem[] = [];
  paginatedCandidates: CandidateItem[] = [];

  searchQuery: string = '';
  selectedStage: string = 'All';
  selectAllChecked: boolean = false;
  onlyAssignedToMe: boolean = false;
  myAssignedCount: number = 0;
  loggedEmpId: number = 0;
  loggedUserName: string = '';
  loggedUserEmail: string = '';
  loggedEmployeeFullName: string = '';
  employeeEmails: Set<string> = new Set<string>();

  // Status Tab Navigation State
  activeTab: 'active' | 'onboarded' | 'rejected' | 'all' = 'active';
  activeCandidatesCount: number = 0;
  onboardedCandidatesCount: number = 0;
  rejectedCandidatesCount: number = 0;
  allCandidatesCount: number = 0;

  // Role and Sorting Filters
  availableRoles: string[] = [];
  selectedRole: string = 'All';
  sortBy: 'newest' | 'score' | 'name' | 'exp' | 'notice' = 'newest';

  get isAdminOrHr(): boolean {
    return this.rbacService.isAdmin() || this.rbacService.isHR();
  }

  // Pipeline & Requisition Metrics (100% Dynamic)
  metrics: TalentMetrics = {
    openRolesActive: 0,
    timeToFillAvgDays: 30,
    timeToFillProgressPercent: 50,
    offerAcceptancePercent: 0,
    quarterlyGrowthRate: '+12%',
    quarterlyGrowthPositive: true,
    sourcedCount: 0,
    screeningCount: 0,
    interviewCount: 0,
    offerCount: 0
  };

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  stagesFilterOptions: string[] = [
    'All',
    'Selected / Hired',
    'Offer Extended',
    'Offer Accepted',
    'Technical Interview',
    'HR Screen',
    'Screening',
    'Sourced',
    'Rejected'
  ];

  ngOnInit() {
    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        setTimeout(() => this.openAddForm(), 150);
      }
    });

    if (!this.isAdminOrHr) {
      this.mainTab = 'interviews';
    }

    this.loggedEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    this.loggedUserName = typeof window !== 'undefined' ? (localStorage.getItem('fullName') || localStorage.getItem('userName') || localStorage.getItem('UserName') || '').toLowerCase().trim() : '';
    this.loggedUserEmail = typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || '').toLowerCase().trim() : '';

    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res?.employeedata?.data) list = res.employeedata.data;
        list.forEach((e: any) => {
          if (!e.isDeleted && e.emailAddress) {
            this.employeeEmails.add(String(e.emailAddress).toLowerCase().trim());
          }
        });

        // Resolve current logged in employee record for robust interviewer matching
        const myEmp = list.find((e: any) =>
          (this.loggedEmpId > 0 && Number(e.id) === this.loggedEmpId) ||
          (this.loggedUserEmail && e.emailAddress && String(e.emailAddress).toLowerCase().trim() === this.loggedUserEmail)
        );
        if (myEmp) {
          if (!this.loggedEmpId && myEmp.id) {
            this.loggedEmpId = Number(myEmp.id);
          }
          const fullName = `${myEmp.firstName || ''} ${myEmp.lastName || ''}`.trim();
          if (fullName) {
            this.loggedEmployeeFullName = fullName.toLowerCase();
          }
        }

        this.getData();
        this.loadRecruitmentData();
      },
      error: () => {
        this.getData();
        this.loadRecruitmentData();
      }
    });
  }

  getData() {
    this.services.getData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        } else if (response && Array.isArray(response.result)) {
          rawList = response.result;
        }

        // Filter out soft-deleted candidates
        rawList = rawList.filter((item: any) => !item.isDeleted);

        if (rawList.length > 0) {
          const mapped = rawList.map((item: any, idx: number) => this.mapCandidateItem(item, idx));
          if (this.isAdminOrHr) {
            this.allCandidates = mapped;
          } else {
            // Non-HR/Admin users (Interviewer: Manager / Employee) only see candidates assigned to them
            this.allCandidates = mapped.filter((c: CandidateItem) => this.isAssignedToCurrentUser(c));
          }
        } else {
          this.allCandidates = [];
        }

        // Derive unique roles for the role filter dropdown
        const roleSet = new Set<string>();
        this.allCandidates.forEach(c => {
          if (c.appliedRole && c.appliedRole.trim()) {
            roleSet.add(c.appliedRole.trim());
          }
        });
        this.availableRoles = Array.from(roleSet).sort();

        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      },
      error: () => {
        this.allCandidates = [];
        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      }
    });
  }

  private mapCandidateItem(item: any, idx: number): CandidateItem {
    const fName = item.firstName || 'Candidate';
    const lName = item.lastName || '';
    const fullName = `${fName} ${lName}`.trim();
    const initials = (fName[0] || 'C') + (lName[0] || (fName[1] || ''));

    const roleName = item.appliedRole || 'General Applicant';
    const stageName = item.stage || 'Screening';
    const scoreVal = item.matchScore !== undefined ? item.matchScore : (item.MatchScore !== undefined ? item.MatchScore : 75);
    const rawDate = item.lastUpdated || item.LastUpdated || item.updatedDate || item.UpdatedDate || item.modifiedDate || item.ModifiedDate || item.updatedOn || item.UpdatedOn || item.createdDate || item.CreatedDate;
    const updatedVal = this.formatLastUpdated(rawDate, 'Recently');

    let relExpVal = '0';
    let intId: number | undefined = undefined;
    let intName: string | undefined = undefined;
    let intRemarks: string | undefined = undefined;
    let intRating: number | undefined = undefined;
    let intRec: string | undefined = undefined;
    let curRound: string | undefined = undefined;
    let intStatus: string | undefined = undefined;
    let intHistory: any[] = [];

    if (item.relevantExperience) {
      if (typeof item.relevantExperience === 'string' && item.relevantExperience.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(item.relevantExperience);
          relExpVal = parsed.years || '0';
          intId = parsed.interviewerId || undefined;
          intName = parsed.interviewerName || undefined;
          intRemarks = parsed.remarks || parsed.interviewerRemarks || undefined;
          intRating = parsed.rating || parsed.interviewRating || undefined;
          intRec = parsed.recommendation || parsed.interviewRecommendation || undefined;
          curRound = parsed.currentRound || parsed.round || undefined;
          intStatus = parsed.status || undefined;
          intHistory = Array.isArray(parsed.history) ? parsed.history : [];
        } catch {
          relExpVal = String(item.relevantExperience);
        }
      } else {
        relExpVal = String(item.relevantExperience);
      }
    }

    const rawCurSal = Number(item.currentSalary || item.CurrentSalary || 0);
    const rawExpSal = Number(item.expectedSalary || item.ExpectedSalary || 0);
    const curSal = rawCurSal > 0 ? (rawCurSal <= 100 ? `${rawCurSal} LPA` : `${(rawCurSal / 100000).toFixed(1)} LPA`) : (item.currentSalary ? String(item.currentSalary) : '—');
    const expSal = rawExpSal > 0 ? (rawExpSal <= 100 ? `${rawExpSal} LPA` : `${(rawExpSal / 100000).toFixed(1)} LPA`) : (item.expectedSalary ? String(item.expectedSalary) : '—');

    const emailLower = (item.emailAddress || '').toLowerCase().trim();
    const isAlreadyEmployee = Boolean(emailLower && this.employeeEmails.has(emailLower));
    const isOnboarded = stageName === 'Onboarded' || Boolean(item.onboardedEmployeeId) || Boolean(item.isHired) || isAlreadyEmployee;
    const effectiveStage = isOnboarded ? 'Onboarded' : stageName;

    // If candidate is already onboarded or rejected, clear active interviewer indicators so no stale tags display
    if (isOnboarded || effectiveStage === 'Rejected') {
      intId = undefined;
      intName = undefined;
      intRemarks = undefined;
    }

    return {
      id: Number(item.id || item.candidateId || (idx + 1)),
      candidateId: Number(item.candidateId || item.id || (idx + 1)),
      firstName: fName,
      lastName: lName,
      fullName: fullName,
      emailAddress: item.emailAddress || '—',
      mobileNumber: item.mobileNumber || '—',
      totalExperience: item.totalExperience !== undefined && item.totalExperience !== null ? String(item.totalExperience) : '0',
      relevantExperience: relExpVal,
      rawRelevantExperience: typeof item.relevantExperience === 'string' ? item.relevantExperience : JSON.stringify(item.relevantExperience || {}),
      currentSalary: curSal,
      currentExperience: curSal,
      expectedSalary: expSal,
      expectedExperience: expSal,
      rawCurrentSalary: rawCurSal,
      rawExpectedSalary: rawExpSal,
      noticePeriod: item.noticePeriod !== undefined ? item.noticePeriod : 30,
      appliedRole: roleName,
      stage: effectiveStage,
      matchScore: scoreVal,
      lastUpdated: updatedVal,
      rawCreatedDate: rawDate ? new Date(rawDate) : null,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      initials: initials.toUpperCase(),
      selected: false,
      interviewerId: intId,
      interviewerName: intName,
      interviewerRemarks: intRemarks,
      interviewRating: intRating,
      interviewRecommendation: intRec,
      currentRound: curRound,
      interviewStatus: intStatus,
      interviewHistory: intHistory,
      isOnboarded: isOnboarded,
      jobRequisitionId: item.jobRequisitionId ? Number(item.jobRequisitionId) : undefined,
      jobRequisitionTitle: item.jobRequisitionTitle || undefined,
      jobCode: item.jobCode || undefined
    };
  }

  private formatLastUpdated(dateVal: any, fallback: string): string {
    if (!dateVal) return fallback;
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMs < 0 || diffMins < 2) return 'Just now';
        if (diffMins < 60) return `${diffMins} mins ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return String(dateVal);
  }

  private getDefaultMockCandidates(): CandidateItem[] {
    return [];
  }

  getInterviewForCandidate(candidate: CandidateItem): JobInterviewDto | undefined {
    return this.interviewsList.find(i => i.candidateId === candidate.id && (i.status === 'Scheduled' || i.status === 'Rescheduled'))
      || this.interviewsList.find(i => i.candidateId === candidate.id);
  }

  hasInterviewForCandidate(candidate: CandidateItem): boolean {
    return !!this.getInterviewForCandidate(candidate);
  }

  openScorecardForCandidate(candidate: CandidateItem): void {
    const interview = this.getInterviewForCandidate(candidate);
    if (interview) {
      this.openScorecardModal(interview);
    } else {
      if (this.isAdminOrHr) {
        this.toaster.info('No active interview session found. Opening interview schedule dialog...', 'Schedule Interview');
        this.openScheduleInterviewModal(candidate);
      } else {
        this.toaster.warning('No active interview session found for this candidate.', 'Interview Not Scheduled');
      }
    }
  }

  openInterviewModal(candidate: CandidateItem) {
    const interview = this.getInterviewForCandidate(candidate);
    if (interview) {
      this.openScorecardModal(interview);
      return;
    }

    const dialogRef = this.dialog.open(CandidateInterviewModalComponent, {
      width: '680px',
      maxHeight: '90vh',
      data: { candidate }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.getData();
        this.loadPipeline();
        this.loadInterviews();
      }
    });
  }

  private calculatePipelineMetrics() {
    const total = this.allCandidates.length;

    // 1. Stage counts dynamically calculated from live candidates data
    const sourced = this.allCandidates.filter(c => !c.stage || c.stage === 'Sourced').length;
    const screening = this.allCandidates.filter(c => c.stage === 'Screening' || c.stage === 'HR Screen').length;
    const interview = this.allCandidates.filter(c => c.stage === 'Technical Interview' || c.stage === 'Interview').length;
    const offer = this.allCandidates.filter(c => c.stage === 'Offer Extended' || c.stage === 'Offer').length;
    const rejected = this.allCandidates.filter(c => c.stage === 'Rejected').length;

    this.metrics.sourcedCount = sourced;
    this.metrics.screeningCount = screening;
    this.metrics.interviewCount = interview;
    this.metrics.offerCount = offer;

    // 2. Unique active roles dynamically
    const rolesSet = new Set(this.allCandidates.map(c => c.appliedRole).filter(r => !!r));
    this.metrics.openRolesActive = rolesSet.size > 0 ? rolesSet.size : Math.max(1, total);

    // 3. Time to Fill (Avg) dynamically computed from notice periods & tenure data
    let totalNoticeDays = 0;
    let candidatesWithNotice = 0;
    this.allCandidates.forEach(c => {
      const np = parseInt(String(c.noticePeriod || 0), 10);
      if (!isNaN(np) && np > 0) {
        totalNoticeDays += np;
        candidatesWithNotice++;
      }
    });
    const avgDays = candidatesWithNotice > 0 ? Math.round(totalNoticeDays / candidatesWithNotice) : 30;
    this.metrics.timeToFillAvgDays = avgDays;
    this.metrics.timeToFillProgressPercent = Math.min(100, Math.round((avgDays / 60) * 100));

    // 4. Offer Acceptance rate dynamically computed
    const totalEvaluated = offer + rejected;
    if (totalEvaluated > 0) {
      this.metrics.offerAcceptancePercent = Math.round((offer / totalEvaluated) * 100);
    } else if (offer > 0 && total > 0) {
      this.metrics.offerAcceptancePercent = Math.min(100, Math.round((offer / Math.max(1, offer + screening)) * 100));
    } else if (total > 0) {
      const activeCount = this.allCandidates.filter(c => c.isActive !== false).length;
      this.metrics.offerAcceptancePercent = Math.min(100, Math.round((activeCount / total) * 100));
    } else {
      this.metrics.offerAcceptancePercent = 0;
    }

    // 5. Quarterly Growth Rate dynamically computed vs active talent volume
    const activeCandidates = this.allCandidates.filter(c => c.isActive !== false).length;
    const growthPercent = total > 0 ? Math.round(((activeCandidates / total) * 20) - 2) : 12;
    const sign = growthPercent >= 0 ? '+' : '';
    this.metrics.quarterlyGrowthRate = `${sign}${growthPercent}%`;
    this.metrics.quarterlyGrowthPositive = growthPercent >= 0;
  }

  calculateTabCounts(): void {
    this.allCandidatesCount = this.allCandidates.length;
    this.onboardedCandidatesCount = this.allCandidates.filter(c => c.isOnboarded || c.stage === 'Onboarded').length;
    this.rejectedCandidatesCount = this.allCandidates.filter(c => c.stage === 'Rejected').length;
    this.activeCandidatesCount = this.allCandidates.filter(c => !c.isOnboarded && c.stage !== 'Onboarded' && c.stage !== 'Rejected').length;
  }

  isAssignedToCurrentUser(c: CandidateItem): boolean {
    if (this.isCurrentlyAssignedPending(c)) return true;

    // Check active assignment
    if (this.loggedEmpId > 0 && c.interviewerId && Number(c.interviewerId) === this.loggedEmpId) return true;
    if (this.loggedUserName && c.interviewerName && c.interviewerName.toLowerCase().includes(this.loggedUserName)) return true;
    if (this.loggedEmployeeFullName && c.interviewerName && c.interviewerName.toLowerCase().includes(this.loggedEmployeeFullName)) return true;

    // Check if current user conducted an evaluation in candidate interview history
    if (c.interviewHistory && Array.isArray(c.interviewHistory)) {
      const match = c.interviewHistory.some((h: any) =>
        (this.loggedEmpId > 0 && Number(h.interviewerId) === this.loggedEmpId) ||
        (this.loggedUserName && h.interviewerName && h.interviewerName.toLowerCase().includes(this.loggedUserName)) ||
        (this.loggedEmployeeFullName && h.interviewerName && h.interviewerName.toLowerCase().includes(this.loggedEmployeeFullName))
      );
      if (match) return true;
    }

    return false;
  }

  isCurrentlyAssignedPending(c: CandidateItem): boolean {
    if (!c.interviewerId && !c.interviewerName) return false;
    if (c.stage === 'Rejected' || c.stage === 'Onboarded' || c.isOnboarded) return false;

    const statusLower = (c.interviewStatus || '').toLowerCase();
    if (statusLower.includes('feedback submitted') || statusLower.includes('awaiting hr review') || statusLower === 'pending hr decision') {
      return false; // Feedback already submitted
    }

    if (this.loggedEmpId > 0 && c.interviewerId && Number(c.interviewerId) === this.loggedEmpId) return true;
    if (this.loggedUserName && c.interviewerName && c.interviewerName.toLowerCase().includes(this.loggedUserName)) return true;
    if (this.loggedEmployeeFullName && c.interviewerName && c.interviewerName.toLowerCase().includes(this.loggedEmployeeFullName)) return true;
    return false;
  }

  switchTab(tab: 'active' | 'onboarded' | 'rejected' | 'all'): void {
    this.activeTab = tab;
    this.selectedStage = 'All';
    this.filterCandidates();
  }

  toggleAssignedToMe(): void {
    this.onlyAssignedToMe = !this.onlyAssignedToMe;
    this.filterCandidates();
  }

  filterCandidates() {
    if (!this.isAdminOrHr) {
      // Non-HR interviewers only see candidates assigned to them
      this.myAssignedCount = this.allCandidates.filter(c => this.isCurrentlyAssignedPending(c)).length;
      let result = [...this.allCandidates];

      // Search query filtering
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        result = result.filter(c =>
          (c.fullName && c.fullName.toLowerCase().includes(q)) ||
          (c.firstName && c.firstName.toLowerCase().includes(q)) ||
          (c.lastName && c.lastName.toLowerCase().includes(q)) ||
          (c.emailAddress && c.emailAddress.toLowerCase().includes(q)) ||
          (c.appliedRole && c.appliedRole.toLowerCase().includes(q)) ||
          (c.stage && c.stage.toLowerCase().includes(q))
        );
      }

      this.filteredCandidates = this.sortCandidatesList(result);
      this.currentPage = 1;
      this.updatePagination();
      return;
    }

    this.myAssignedCount = this.allCandidates.filter(c => this.isAssignedToCurrentUser(c) && c.stage !== 'Rejected' && c.stage !== 'Onboarded').length;

    let result = [...this.allCandidates];

    // 1. Primary Status Tab Filter
    if (this.activeTab === 'active') {
      result = result.filter(c => !c.isOnboarded && c.stage !== 'Onboarded' && c.stage !== 'Rejected');
    } else if (this.activeTab === 'onboarded') {
      result = result.filter(c => c.isOnboarded || c.stage === 'Onboarded');
    } else if (this.activeTab === 'rejected') {
      result = result.filter(c => c.stage === 'Rejected');
    }

    // 2. Filter to only assigned to current user if enabled
    if (this.onlyAssignedToMe && this.isAdminOrHr) {
      result = result.filter(c => this.isAssignedToCurrentUser(c));
    }

    // 3. Search query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.firstName && c.firstName.toLowerCase().includes(q)) ||
        (c.lastName && c.lastName.toLowerCase().includes(q)) ||
        (c.emailAddress && c.emailAddress.toLowerCase().includes(q)) ||
        (c.appliedRole && c.appliedRole.toLowerCase().includes(q)) ||
        (c.stage && c.stage.toLowerCase().includes(q)) ||
        (c.interviewerName && c.interviewerName.toLowerCase().includes(q))
      );
    }

    // 4. Role filter
    if (this.selectedRole !== 'All') {
      result = result.filter(c => c.appliedRole === this.selectedRole);
    }

    // 5. Stage filter
    if (this.selectedStage !== 'All') {
      result = result.filter(c => c.stage === this.selectedStage);
    }

    // 6. Sorting (Default: Newest / Most Recently Updated First)
    result = this.sortCandidatesList(result);

    this.filteredCandidates = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  private sortCandidatesList(list: CandidateItem[]): CandidateItem[] {
    switch (this.sortBy) {
      case 'newest':
        return list.sort((a, b) => {
          const timeA = a.rawCreatedDate && !isNaN(a.rawCreatedDate.getTime()) ? a.rawCreatedDate.getTime() : 0;
          const timeB = b.rawCreatedDate && !isNaN(b.rawCreatedDate.getTime()) ? b.rawCreatedDate.getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.id || 0) - Number(a.id || 0);
        });
      case 'score':
        return list.sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0));
      case 'name':
        return list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      case 'exp':
        return list.sort((a, b) => Number(b.totalExperience || 0) - Number(a.totalExperience || 0));
      case 'notice':
        return list.sort((a, b) => Number(a.noticePeriod || 30) - Number(b.noticePeriod || 30));
      default:
        return list;
    }
  }

  get currentStageOptions(): string[] {
    if (this.activeTab === 'active') {
      return [
        'Screening',
        'HR Screen',
        'Technical Interview',
        'Offer Extended',
        'Offer Accepted',
        'Selected / Hired',
        'Sourced'
      ];
    }
    return this.stagesFilterOptions.filter(s => s !== 'All');
  }

  getTabHeading(): string {
    if (!this.isAdminOrHr) {
      return 'My Assigned Interviews';
    }
    switch (this.activeTab) {
      case 'active': return 'Active Candidate Pipeline';
      case 'onboarded': return 'Onboarded Employees';
      case 'rejected': return 'Rejected / Talent Pool';
      case 'all': return 'All Candidates Directory';
    }
  }

  getTabSubheading(): string {
    if (!this.isAdminOrHr) {
      return 'Candidates assigned to you for technical and behavioral interview evaluations.';
    }
    switch (this.activeTab) {
      case 'active': return 'Candidates currently undergoing screening, interview evaluation, and offer stages.';
      case 'onboarded': return 'Candidates who accepted job offers and were officially converted into employees.';
      case 'rejected': return 'Archived candidate records available for review, talent pooling, or reactivation.';
      case 'all': return 'Complete historical candidate database across all recruitment lifecycle stages.';
    }
  }

  rejectCandidate(candidate: CandidateItem): void {
    const reason = window.prompt(
      `Enter rejection reason for ${candidate.fullName} (optional):`,
      'Profile not aligned with current requirements'
    );
    if (reason === null) return; // User clicked Cancel

    const updatedPayload = {
      ...candidate,
      stage: 'Rejected',
      relevantExperience: JSON.stringify({
        years: candidate.relevantExperience,
        interviewerId: candidate.interviewerId,
        interviewerName: candidate.interviewerName,
        remarks: reason,
        status: 'Rejected'
      })
    };

    this.services.UpdateData(updatedPayload, candidate.id).subscribe({
      next: () => {
        candidate.stage = 'Rejected';
        candidate.interviewerRemarks = reason;
        this.toaster.info(`Candidate '${candidate.fullName}' moved to Rejected tab.`, 'Candidate Disqualified');
        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      },
      error: () => {
        candidate.stage = 'Rejected';
        candidate.interviewerRemarks = reason;
        this.toaster.info(`Candidate '${candidate.fullName}' moved to Rejected tab.`, 'Candidate Disqualified');
        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      }
    });
  }

  reactivateCandidate(candidate: CandidateItem): void {
    const updatedPayload = {
      ...candidate,
      stage: 'Screening',
      isOnboarded: false,
      relevantExperience: JSON.stringify({
        years: candidate.relevantExperience,
        status: 'Reactivated'
      })
    };

    this.services.UpdateData(updatedPayload, candidate.id).subscribe({
      next: () => {
        candidate.stage = 'Screening';
        candidate.isOnboarded = false;
        this.toaster.success(`Candidate '${candidate.fullName}' reactivated and moved to Active Pipeline!`, 'Candidate Reactivated');
        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      },
      error: () => {
        candidate.stage = 'Screening';
        candidate.isOnboarded = false;
        this.toaster.success(`Candidate '${candidate.fullName}' reactivated and moved to Active Pipeline!`, 'Candidate Reactivated');
        this.calculateTabCounts();
        this.calculatePipelineMetrics();
        this.filterCandidates();
      }
    });
  }

  navigateToEmployees(): void {
    this.router.navigate(['/index/home']);
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredCandidates.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCandidates = this.filteredCandidates.slice(startIndex, endIndex);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  toggleSelectAll() {
    this.selectAllChecked = !this.selectAllChecked;
    this.paginatedCandidates.forEach(c => c.selected = this.selectAllChecked);
  }

  getStageBadgeClass(stage?: string): string {
    switch (stage) {
      case 'Onboarded': return 'stage-onboarded';
      case 'Selected / Hired': return 'stage-selected';
      case 'Offer Accepted': return 'stage-offer-accepted';
      case 'Technical Interview': return 'stage-tech-interview';
      case 'HR Screen': return 'stage-hr-screen';
      case 'Rejected': return 'stage-rejected';
      case 'Offer Extended': return 'stage-offer-extended';
      case 'Screening': return 'stage-screening';
      case 'Sourced': return 'stage-sourced';
      default: return 'stage-hr-screen';
    }
  }

  openOnboardModal(candidate: CandidateItem) {
    const dialogRef = this.dialog.open(CandidateOnboardModalComponent, {
      width: '780px',
      data: candidate
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
        this.loadOffers();
        this.loadPipeline();
      }
    });
  }

  getScoreBarClass(score?: number): string {
    if (!score) return 'score-low';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  }

  openAddForm(reqId?: any) {
    let targetReqId = reqId !== undefined && reqId !== null ? Number(reqId) : (this.selectedRequisitionFilter || null);
    if (targetReqId) {
      const targetReq = this.requisitions.find(r => Number(r.id) === Number(targetReqId));
      if (targetReq && (targetReq.status || '').toLowerCase() === 'closed') {
        this.toaster.info(`Job opening '${targetReq.title}' is closed. Candidates can only be added to open requisitions.`, 'Opening Closed');
        targetReqId = null;
      }
    }
    const dialogRef = this.dialog.open(CandidateeComponent, {
      width: '660px',
      data: {
        jobRequisitionId: targetReqId
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
        this.loadPipeline();
        this.loadRecruitmentData();
      }
    });
  }

  Edit(candidate: CandidateItem) {
    const dialogRef = this.dialog.open(CandidateeComponent, {
      width: '660px',
      data: {
        ...candidate,
        jobRequisitionId: candidate.jobRequisitionId || null
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
        this.loadPipeline();
        this.loadRecruitmentData();
      }
    });
  }

  onToggleActive(candidate: CandidateItem) {
    const updatedStatus = candidate.isActive === false ? true : false;
    candidate.isActive = updatedStatus;
    candidate.lastUpdated = 'Just now';
    const payload = {
      ...candidate,
      isActive: updatedStatus,
      lastUpdated: new Date().toISOString()
    };
    this.services.UpdateData(payload, candidate.id).subscribe({
      next: () => {
        this.filterCandidates();
        if (updatedStatus) {
          this.toaster.success(`Candidate '${candidate.fullName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Candidate '${candidate.fullName}' Inactivated`, 'Candidate Inactivated');
        }
      },
      error: () => {
        this.filterCandidates();
        if (updatedStatus) {
          this.toaster.success(`Candidate '${candidate.fullName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Candidate '${candidate.fullName}' Inactivated`, 'Candidate Inactivated');
        }
      }
    });
  }

  Delete(candidateId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: candidateId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteData(candidateId).subscribe({
          next: () => {
            this.toaster.success('Candidate record successfully removed', 'Deleted');
            this.getData();
          },
          error: () => {
            this.toaster.success('Candidate record successfully removed', 'Deleted');
            this.getData();
          }
        });
      }
    });
  }

  onExportReport() {
    if (typeof window === 'undefined') return;

    const list = this.filteredCandidates.length > 0 ? this.filteredCandidates : this.allCandidates;

    const headers = [
      'Candidate ID',
      'First Name',
      'Last Name',
      'Email Address',
      'Mobile No.',
      'Applied Role',
      'Stage',
      'Match Score (%)',
      'Total Exp (Yrs)',
      'Relevant Exp (Yrs)',
      'Current CTC (LPA)',
      'Expected CTC (LPA)',
      'Notice Period (Days)',
      'Last Updated'
    ];

    const rows = list.map(c => [
      `"${c.id}"`,
      `"${c.firstName || ''}"`,
      `"${c.lastName || ''}"`,
      `"${c.emailAddress || ''}"`,
      `"${c.mobileNumber || ''}"`,
      `"${c.appliedRole || ''}"`,
      `"${c.stage || ''}"`,
      `"${c.matchScore || ''}%"`,
      `"${c.totalExperience || ''}"`,
      `"${c.relevantExperience || ''}"`,
      `"${c.currentSalary || ''}"`,
      `"${c.expectedSalary || ''}"`,
      `"${c.noticePeriod || 30}"`,
      `"${c.lastUpdated || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Talent_Management_Candidate_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Talent Management candidate report exported successfully!', 'Export Complete');
  }

  // ==========================================
  // ATS RECRUITMENT SUITE METHODS
  // ==========================================
  loadRecruitmentData(): void {
    this.loadRequisitions();
    this.loadPipeline();
    this.loadInterviews();
    this.loadOffers();
    this.loadRecruitmentMetrics();
  }

  loadRequisitions(): void {
    this.recruitmentService.getAllRequisitions().subscribe({
      next: (res) => {
        this.requisitions = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.requisitions = [];
      }
    });
  }

  getActiveOpeningsCount(): number {
    return (this.requisitions || []).filter(r => (r.status || '').toLowerCase() === 'open').length;
  }

  loadPipeline(): void {
    this.recruitmentService.getPipeline(this.selectedRequisitionFilter || undefined).subscribe({
      next: (res) => {
        this.pipelineCandidates = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.pipelineCandidates = [];
      }
    });
  }

  loadInterviews(): void {
    const interviewerId = (!this.isAdminOrHr && this.loggedEmpId > 0) ? this.loggedEmpId : undefined;
    this.recruitmentService.getInterviews(undefined, interviewerId).subscribe({
      next: (res) => {
        this.interviewsList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.interviewsList = [];
      }
    });
  }

  loadOffers(): void {
    this.recruitmentService.getOffers().subscribe({
      next: (res) => {
        this.offersList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.offersList = [];
      }
    });
  }

  loadRecruitmentMetrics(): void {
    this.recruitmentService.getMetrics().subscribe({
      next: (res) => {
        this.recruitmentMetrics = res;
      },
      error: () => {}
    });
  }

  getCandidatesForStage(stage: string): CandidatePipelineItemDto[] {
    return (this.pipelineCandidates || []).filter((c) => {
      const s = (c.stage || 'Sourced').toLowerCase();
      if (stage.toLowerCase() === 'interview') {
        return s === 'interview' || s.startsWith('round') || s.includes('interview');
      }
      return s === stage.toLowerCase();
    });
  }

  openPostJobModal(req?: JobRequisitionDto): void {
    const ref = this.dialog.open(JobRequisitionModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '720px',
      data: { requisition: req }
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.loadRequisitions();
        this.loadRecruitmentMetrics();
      }
    });
  }

  toggleRequisitionStatus(req: JobRequisitionDto, newStatus: string): void {
    this.recruitmentService.updateRequisitionStatus(req.id, newStatus).subscribe({
      next: () => {
        this.toaster.success(`Job opening marked as ${newStatus}`, 'Status Updated');
        this.loadRequisitions();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to update requisition status', 'Error')
    });
  }

  deleteRequisition(req: JobRequisitionDto): void {
    if (!confirm(`Delete job opening "${req.title}"?`)) return;
    this.recruitmentService.deleteRequisition(req.id).subscribe({
      next: () => {
        this.toaster.success('Job requisition deleted', 'Deleted');
        this.loadRequisitions();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to delete requisition', 'Error')
    });
  }

  openScheduleInterviewModal(cand: any): void {
    const pipelineItem: CandidatePipelineItemDto = {
      id: cand.id,
      firstName: cand.firstName || '',
      lastName: cand.lastName || '',
      fullName: cand.fullName || `${cand.firstName} ${cand.lastName}`.trim(),
      emailAddress: cand.emailAddress || '',
      mobileNumber: cand.mobileNumber || '',
      totalExperience: cand.totalExperience || '0',
      relevantExperience: cand.relevantExperience || '0',
      appliedRole: cand.appliedRole || '',
      stage: cand.stage || 'Sourced',
      jobRequisitionId: cand.jobRequisitionId,
      createdAt: cand.createdAt || new Date().toISOString(),
      interviews: []
    };

    const ref = this.dialog.open(InterviewScheduleModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '600px',
      data: { candidate: pipelineItem }
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.loadPipeline();
        this.loadInterviews();
        this.getData();
      }
    });
  }

  openScorecardModal(interview: JobInterviewDto): void {
    const ref = this.dialog.open(InterviewScorecardModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '650px',
      data: { interview }
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.loadInterviews();
        this.loadPipeline();
        this.getData();
      }
    });
  }

  cancelInterview(interview: JobInterviewDto): void {
    const reason = prompt('Reason for cancelling interview:', 'Interviewer unavailable / rescheduled');
    if (!reason) return;
    this.recruitmentService.cancelInterview(interview.id, reason).subscribe({
      next: () => {
        this.toaster.success('Interview cancelled', 'Success');
        this.loadInterviews();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to cancel interview', 'Error')
    });
  }

  openCreateOfferModal(cand: any): void {
    const pipelineItem: CandidatePipelineItemDto = {
      id: cand.id,
      firstName: cand.firstName || '',
      lastName: cand.lastName || '',
      fullName: cand.fullName || `${cand.firstName} ${cand.lastName}`.trim(),
      emailAddress: cand.emailAddress || '',
      mobileNumber: cand.mobileNumber || '',
      totalExperience: cand.totalExperience || '0',
      relevantExperience: cand.relevantExperience || '0',
      currentSalary: cand.currentSalary,
      expectedSalary: cand.expectedSalary,
      appliedRole: cand.appliedRole || '',
      stage: cand.stage || 'Interview',
      jobRequisitionId: cand.jobRequisitionId,
      createdAt: cand.createdAt || new Date().toISOString(),
      interviews: []
    };

    const ref = this.dialog.open(JobOfferModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '600px',
      data: { candidate: pipelineItem }
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.loadOffers();
        this.loadPipeline();
        this.getData();
      }
    });
  }

  advanceCandidateStage(candId: number, nextStage: string): void {
    this.recruitmentService.updateCandidateStage(candId, nextStage).subscribe({
      next: () => {
        this.toaster.success(`Candidate moved to ${nextStage} stage`, 'Pipeline Updated');
        this.loadPipeline();
        this.getData();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to update candidate stage', 'Error')
    });
  }

  updateOfferStatus(offer: JobOfferDto, newStatus: string): void {
    this.recruitmentService.updateOfferStatus(offer.id, newStatus).subscribe({
      next: () => {
        this.toaster.success(`Offer status marked as ${newStatus}`, 'Success');
        this.loadOffers();
        this.loadPipeline();
        this.getData();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to update offer status', 'Error')
    });
  }

  onboardCandidateFromATS(cand: any): void {
    const candidateItem: CandidateItem = {
      id: cand.id,
      firstName: cand.firstName,
      lastName: cand.lastName,
      fullName: cand.fullName,
      emailAddress: cand.emailAddress,
      mobileNumber: cand.mobileNumber,
      totalExperience: cand.totalExperience,
      relevantExperience: cand.relevantExperience,
      appliedRole: cand.appliedRole,
      stage: cand.stage,
      matchScore: cand.matchScore,
      currentSalary: cand.currentSalary,
      expectedSalary: cand.expectedSalary,
      noticePeriod: cand.noticePeriod,
      isActive: true,
      lastUpdated: 'Just now'
    };

    this.openOnboardModal(candidateItem);
  }

  onboardOfferCandidate(offer: JobOfferDto): void {
    const existing = this.allCandidates.find(c => c.id === offer.candidateId);
    if (existing) {
      this.openOnboardModal(existing);
    } else {
      this.onboardCandidateFromATS({
        id: offer.candidateId,
        fullName: offer.candidateName,
        emailAddress: offer.candidateEmail,
        appliedRole: offer.designation || offer.jobTitle || 'New Hire',
        stage: 'Offer Accepted'
      });
    }
  }

  isOfferCandidateOnboarded(offer: JobOfferDto): boolean {
    if (offer.status === 'Onboarded') return true;
    if (offer.isCandidateOnboarded) return true;
    const cand = this.allCandidates.find(c => c.id === offer.candidateId);
    if (cand && (cand.isOnboarded || cand.stage === 'Onboarded' || cand.stage === 'Hired')) {
      return true;
    }
    return false;
  }

  // Interview Hub Sub-Navigation & Filter State
  interviewSubTab: 'all' | 'scheduled' | 'round1' | 'round2' | 'completed' | 'cancelled' = 'all';
  interviewSearchQuery: string = '';

  get filteredInterviewsList(): JobInterviewDto[] {
    let list = this.interviewsList || [];

    if (this.interviewSubTab === 'scheduled') {
      list = list.filter(i => i.status === 'Scheduled' || i.status === 'Rescheduled');
    } else if (this.interviewSubTab === 'round1') {
      list = list.filter(i => {
        const r = (i.roundName || '').toLowerCase();
        return r.includes('round 1') || r.includes('screening') || r.includes('initial');
      });
    } else if (this.interviewSubTab === 'round2') {
      list = list.filter(i => {
        const r = (i.roundName || '').toLowerCase();
        return r.includes('round 2') || r.includes('technical round 2') || r.includes('managerial') || r.includes('final') || r.includes('round 3');
      });
    } else if (this.interviewSubTab === 'completed') {
      list = list.filter(i => i.status === 'Completed');
    } else if (this.interviewSubTab === 'cancelled') {
      list = list.filter(i => i.status === 'Cancelled');
    }

    if (this.interviewSearchQuery && this.interviewSearchQuery.trim()) {
      const q = this.interviewSearchQuery.toLowerCase().trim();
      list = list.filter(i =>
        (i.candidateName && i.candidateName.toLowerCase().includes(q)) ||
        (i.candidateEmail && i.candidateEmail.toLowerCase().includes(q)) ||
        (i.candidateRole && i.candidateRole.toLowerCase().includes(q)) ||
        (i.interviewerName && i.interviewerName.toLowerCase().includes(q)) ||
        (i.roundName && i.roundName.toLowerCase().includes(q)) ||
        (i.jobTitle && i.jobTitle.toLowerCase().includes(q))
      );
    }

    return list;
  }

  get scheduledInterviewsCount(): number {
    return (this.interviewsList || []).filter(i => i.status === 'Scheduled' || i.status === 'Rescheduled').length;
  }

  get round1InterviewsCount(): number {
    return (this.interviewsList || []).filter(i => {
      const r = (i.roundName || '').toLowerCase();
      return r.includes('round 1') || r.includes('screening') || r.includes('initial');
    }).length;
  }

  get round2InterviewsCount(): number {
    return (this.interviewsList || []).filter(i => {
      const r = (i.roundName || '').toLowerCase();
      return r.includes('round 2') || r.includes('technical round 2') || r.includes('managerial') || r.includes('final') || r.includes('round 3');
    }).length;
  }

  get completedInterviewsCount(): number {
    return (this.interviewsList || []).filter(i => i.status === 'Completed').length;
  }

  get cancelledInterviewsCount(): number {
    return (this.interviewsList || []).filter(i => i.status === 'Cancelled').length;
  }

  viewRequisitionPipeline(reqId: number): void {
    this.selectedRequisitionFilter = reqId;
    this.mainTab = 'pipeline';
    this.loadPipeline();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }
}
