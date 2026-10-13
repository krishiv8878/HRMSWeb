import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  ExpenseAdvanceDto,
  ExpenseCategory,
  ExpenseMileageDto,
  ExpenseReportDetailDto,
  ExpenseService
} from '../../services/expense/expense.service';
import { RbacService } from '../../core/rbac.service';
import { ExpenseReportModalComponent } from '../../modal/expense/expense-report-modal/expense-report-modal.component';
import { ExpenseAdvanceModalComponent } from '../../modal/expense/expense-advance-modal/expense-advance-modal.component';
import { ExpenseReviewModalComponent } from '../../modal/expense/expense-review-modal/expense-review-modal.component';
import { ExpenseDisburseModalComponent } from '../../modal/expense/expense-disburse-modal/expense-disburse-modal.component';
import { ExpenseCategoryModalComponent } from '../../modal/expense/expense-category-modal/expense-category-modal.component';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.scss']
})
export class ExpenseComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  public rbacService = inject(RbacService);

  activeTab: 'my-claims' | 'mileage' | 'advances' | 'approvals' | 'categories' = 'my-claims';
  isLoading = false;
  isAdminOrHr = false;
  isManager = false;

  // 1. My Claims & Reports
  myReports: ExpenseReportDetailDto[] = [];
  filteredMyReports: ExpenseReportDetailDto[] = [];
  reportStatusFilter: string = 'All';
  searchQuery: string = '';

  // 2. Mileage Trips
  mileageTrips: (ExpenseMileageDto & { reportTitle?: string; reportNumber?: string })[] = [];

  // 3. Advances
  myAdvances: ExpenseAdvanceDto[] = [];
  allAdvances: ExpenseAdvanceDto[] = [];
  advanceStatusFilter: string = 'All';

  // 4. Approvals Queue (Manager / Finance)
  allPendingReports: ExpenseReportDetailDto[] = [];
  filteredApprovalReports: ExpenseReportDetailDto[] = [];
  approvalStageFilter: 'All' | 'Manager' | 'Finance' | 'Paid' = 'All';

  // 5. Categories Master
  categories: ExpenseCategory[] = [];

  ngOnInit(): void {
    this.isAdminOrHr = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);
    this.isManager = this.isAdminOrHr || this.rbacService.hasAnyRole(['Manager', 'Management', 'Finance']);

    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.loadMyReports();
    this.loadCategories();
    this.loadAdvances();

    if (this.isManager) {
      this.loadAllReports();
    }
  }

  loadMyReports(): void {
    this.expenseService.getMyReports().subscribe({
      next: (res) => {
        this.myReports = Array.isArray(res) ? res : [];
        this.applyMyReportsFilter();
        this.extractMileageTrips();
        this.isLoading = false;
      },
      error: () => {
        this.myReports = [];
        this.isLoading = false;
      }
    });
  }

  loadAllReports(): void {
    this.expenseService.getAllReports().subscribe({
      next: (res) => {
        this.allPendingReports = Array.isArray(res) ? res : [];
        this.applyApprovalsFilter();
      },
      error: () => {
        this.allPendingReports = [];
      }
    });
  }

  loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next: (res) => {
        this.categories = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  loadAdvances(): void {
    this.expenseService.getMyAdvances().subscribe({
      next: (res) => {
        this.myAdvances = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.myAdvances = [];
      }
    });

    if (this.isAdminOrHr || this.isManager) {
      this.expenseService.getAllAdvances().subscribe({
        next: (res) => {
          this.allAdvances = Array.isArray(res) ? res : [];
        },
        error: () => {
          this.allAdvances = [];
        }
      });
    }
  }

  extractMileageTrips(): void {
    const trips: (ExpenseMileageDto & { reportTitle?: string; reportNumber?: string })[] = [];
    (this.myReports || []).forEach((rep) => {
      if (rep.mileageItems && rep.mileageItems.length > 0) {
        rep.mileageItems.forEach((m) => {
          trips.push({
            ...m,
            reportTitle: rep.title,
            reportNumber: rep.reportNumber
          });
        });
      }
    });
    this.mileageTrips = trips;
  }

  // Filters
  applyMyReportsFilter(): void {
    this.filteredMyReports = (this.myReports || []).filter((r) => {
      const matchStatus = this.reportStatusFilter === 'All' || r.status.toLowerCase() === this.reportStatusFilter.toLowerCase();
      const matchSearch =
        !this.searchQuery.trim() ||
        r.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        r.reportNumber?.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  applyApprovalsFilter(): void {
    this.filteredApprovalReports = (this.allPendingReports || []).filter((r) => {
      if (this.approvalStageFilter === 'Manager') {
        return r.status === 'Submitted';
      } else if (this.approvalStageFilter === 'Finance') {
        return r.status === 'ManagerApproved';
      } else if (this.approvalStageFilter === 'Paid') {
        return r.status === 'Paid';
      }
      return true; // All
    });
  }

  // Summary Metrics
  get totalClaimedAmount(): number {
    return (this.myReports || []).reduce((sum, r) => sum + (r.totalClaimAmount || 0), 0);
  }

  get totalApprovedAmount(): number {
    return (this.myReports || [])
      .filter((r) => r.status === 'ManagerApproved' || r.status === 'FinanceApproved' || r.status === 'Paid')
      .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
  }

  get totalReimbursedAmount(): number {
    return (this.myReports || []).filter((r) => r.status === 'Paid').reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
  }

  get pendingApprovalsCount(): number {
    return (this.myReports || []).filter((r) => r.status === 'Submitted' || r.status === 'ManagerApproved').length;
  }

  get queueManagerPendingCount(): number {
    return (this.allPendingReports || []).filter((r) => r.status === 'Submitted').length;
  }

  get queueFinancePendingCount(): number {
    return (this.allPendingReports || []).filter((r) => r.status === 'ManagerApproved').length;
  }

  get totalDistanceKm(): number {
    return (this.mileageTrips || []).reduce((sum, m) => sum + (m.distanceKm || 0), 0);
  }

  get totalMileageCost(): number {
    return (this.mileageTrips || []).reduce((sum, m) => sum + (m.calculatedAmount || 0), 0);
  }

  // Action Modals
  openCreateReportModal(report?: ExpenseReportDetailDto): void {
    const ref = this.dialog.open(ExpenseReportModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '850px',
      data: { report }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMyReports();
        if (this.isManager) this.loadAllReports();
      }
    });
  }

  openAdvanceModal(): void {
    const ref = this.dialog.open(ExpenseAdvanceModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '550px'
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAdvances();
      }
    });
  }

  openReviewModal(report: ExpenseReportDetailDto): void {
    const stage = report.status === 'Submitted' ? 'Manager' : 'Finance';
    const ref = this.dialog.open(ExpenseReviewModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '900px',
      data: { report, stage }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAllReports();
        this.loadMyReports();
      }
    });
  }

  openDisburseModal(report: ExpenseReportDetailDto): void {
    const ref = this.dialog.open(ExpenseDisburseModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '600px',
      data: { report }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAllReports();
        this.loadMyReports();
      }
    });
  }

  openCategoryModal(category?: ExpenseCategory): void {
    const ref = this.dialog.open(ExpenseCategoryModalComponent, {
      panelClass: 'custom-clean-dialog',
      maxWidth: '95vw',
      width: '650px',
      data: { category }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
      }
    });
  }

  submitReport(id: number): void {
    if (!confirm('Submit this expense report for manager approval?')) return;
    this.expenseService.submitReport(id).subscribe({
      next: () => {
        this.toaster.success('Expense report submitted successfully', 'Success');
        this.loadMyReports();
        if (this.isManager) this.loadAllReports();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to submit report', 'Error')
    });
  }

  deleteReport(id: number): void {
    if (!confirm('Are you sure you want to delete this draft expense report?')) return;
    this.expenseService.deleteReport(id).subscribe({
      next: () => {
        this.toaster.success('Draft report deleted', 'Success');
        this.loadMyReports();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to delete report', 'Error')
    });
  }

  approveAdvance(id: number, isApproved: boolean): void {
    const remarks = prompt(isApproved ? 'Approval remarks (optional):' : 'Rejection reason:');
    if (!isApproved && !remarks) {
      this.toaster.warning('Remarks are required when rejecting advance', 'Validation');
      return;
    }

    this.expenseService.approveAdvance(id, isApproved, remarks || undefined).subscribe({
      next: () => {
        this.toaster.success(`Advance request ${isApproved ? 'approved' : 'rejected'}`, 'Success');
        this.loadAdvances();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to process advance', 'Error')
    });
  }

  disburseAdvance(advance: ExpenseAdvanceDto): void {
    const amtStr = prompt('Confirm disbursed amount (₹):', advance.requestedAmount.toString());
    if (!amtStr) return;
    const amount = Number(amtStr);
    if (isNaN(amount) || amount <= 0) {
      this.toaster.warning('Enter a valid disbursement amount', 'Validation');
      return;
    }

    this.expenseService.disburseAdvance(advance.id, amount, 'Disbursed via Finance transfer').subscribe({
      next: () => {
        this.toaster.success(`Advance ADV-${advance.id} marked as Disbursed`, 'Success');
        this.loadAdvances();
      },
      error: (err) => this.toaster.error(err.error?.message || 'Failed to disburse advance', 'Error')
    });
  }
}
