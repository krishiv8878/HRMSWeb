import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { EmailService } from '../../services/leaveRequest/email.service';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { LeaveLedgerService, LeaveBalanceSummary, LeaveLedgerRecord } from '../../services/leave-ledger/leave-ledger.service';
import { LopConversionService, LopConversionItem } from '../../services/lop-conversion/lop-conversion.service';
import { LeaveEncashmentService, EncashmentRequestItem } from '../../services/leave-encashment/leave-encashment.service';
import { CompOffService, CompOffEligibleDate, CompOffGrantItem } from '../../services/comp-off/comp-off.service';
import { LeaverequestComponent, LeaveTypeItem } from '../../modal/leaverequest/leaverequest.component';
import { CancelLeaveModalComponent } from '../../modal/cancel-leave-modal/cancel-leave-modal.component';
import { GlobalFilterService } from '../../services/filter/global-filter.service';

export interface SubmittedLeaveRequest {
  id: number;
  employeeId?: number;
  startDate: string;
  endDate: string;
  leaveReason: string;
  leaveTypeName?: string;
  leaveTypeId?: number;
  leaveMode?: string;
  totalDays?: number;
  status?: string;
  actionBy?: number;
  actionDate?: string;
  applyDate?: string;
  createdDate?: string;
  rejectionReason?: string;
  isActive?: boolean | number;
  isDeleted?: boolean | number;
  isLop?: boolean;
  isSandwichApplied?: boolean;
  sandwichDays?: number;
  isConvertedFromLop?: boolean;
}

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss'
})
export class LeaveRequestComponent implements OnInit, OnDestroy {
  private emailService = inject(EmailService);
  private leaveTypeService = inject(LeavetypeService);
  private holidayService = inject(HolidayservicesService);
  private leaveLedgerService = inject(LeaveLedgerService);
  private lopConversionService = inject(LopConversionService);
  private leaveEncashmentService = inject(LeaveEncashmentService);
  private compOffService = inject(CompOffService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private globalFilterService = inject(GlobalFilterService);
  private route = inject(ActivatedRoute);
  private filterSub?: Subscription;
  private routeSub?: Subscription;

  holidays: any[] = [];
  Math = Math;

  // Session & Supervisor Separation
  loggedInEmployeeId: number = 0;
  selectedEmployeeId: number | 'All' = 'All';
  selectedEmployeeName: string = '';

  get isViewingOtherEmployee(): boolean {
    if (!this.selectedEmployeeId || this.selectedEmployeeId === 'All') return false;
    return Number(this.selectedEmployeeId) !== Number(this.loggedInEmployeeId);
  }

  // Phase 5: Navigation View Tabs
  activeViewTab: 'requests' | 'breakdown' | 'conversions' | 'compoff' | 'encashment' | 'ledger' = 'requests';

  allRequests: SubmittedLeaveRequest[] = [];
  filteredRequests: SubmittedLeaveRequest[] = [];
  leaveTypes: LeaveTypeItem[] = [];

  // Phase 5 Data Collections
  balanceSummaries: LeaveBalanceSummary[] = [];
  conversionRequests: LopConversionItem[] = [];
  eligibleLopLeaves: any[] = [];
  compOffRequests: CompOffGrantItem[] = [];
  eligibleCompOffDates: CompOffEligibleDate[] = [];
  encashmentRequests: EncashmentRequestItem[] = [];
  ledgerHistory: LeaveLedgerRecord[] = [];

  // Quick Action Forms state
  selectedConversionLopId: number = 0;
  selectedConversionTargetLtId: number = 0;
  selectedConversionDays: number = 1;
  conversionReason: string = '';

  selectedEncashLtId: number = 0;
  selectedEncashDays: number = 1;
  encashReason: string = '';

  compOffReason: string = '';

  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedType: string = 'All';

  // Pagination State - pageSize 10
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedRequests: SubmittedLeaveRequest[] = [];

  // Active Tab: Defaults to 'Pending' on landing as requested by user
  activeTab: 'Pending' | 'Approved' | 'Cancelled' | 'Rejected' | 'All' = 'Pending';
  sortOrder: 'desc' | 'asc' = 'desc';

  // Dynamic Metric Stats
  totalCount: number = 0;
  approvedCount: number = 0;
  pendingCount: number = 0;
  rejectedCount: number = 0;
  cancelledCount: number = 0;
  availableBalanceDays: number = 0;

  getTargetEmployeeId(): number | undefined {
    if (this.selectedEmployeeId && this.selectedEmployeeId !== 'All') {
      return Number(this.selectedEmployeeId);
    }
    return this.loggedInEmployeeId > 0 ? this.loggedInEmployeeId : undefined;
  }

  setActiveViewTab(tab: 'requests' | 'breakdown' | 'conversions' | 'compoff' | 'encashment' | 'ledger') {
    this.activeViewTab = tab;
    if (tab === 'breakdown') {
      this.loadBalanceBreakdown();
    } else if (tab === 'conversions') {
      this.loadConversionData();
    } else if (tab === 'compoff') {
      this.loadCompOffData();
    } else if (tab === 'encashment') {
      this.loadEncashmentData();
    } else if (tab === 'ledger') {
      this.loadLedgerHistory();
    }
  }

  setTab(tab: 'Pending' | 'Approved' | 'Cancelled' | 'Rejected' | 'All') {
    this.activeTab = tab;
    this.currentPage = 1;
    this.filterRequests();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.globalFilterService.setSortOrder(this.sortOrder);
    this.filterRequests();
  }

  ngOnInit() {
    this.loggedInEmployeeId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    this.loadHolidays();
    this.loadLeaveTypes();
    this.loadLeaveBalance();
    this.loadData();

    this.filterSub = this.globalFilterService.filters$.subscribe(f => {
      let empChanged = false;
      if (f.employeeId !== undefined) {
        if (this.selectedEmployeeId !== f.employeeId) {
          this.selectedEmployeeId = f.employeeId;
          this.selectedEmployeeName = f.employeeName || '';
          empChanged = true;
        }
      }
      if (f.sortOrder && f.sortOrder !== this.sortOrder) {
        this.sortOrder = f.sortOrder;
      }
      this.searchQuery = f.search || '';
      this.selectedStatus = f.status || 'All';

      if (empChanged) {
        this.loadLeaveBalance();
        if (this.activeViewTab === 'breakdown') this.loadBalanceBreakdown();
        if (this.activeViewTab === 'conversions') this.loadConversionData();
        if (this.activeViewTab === 'compoff') this.loadCompOffData();
        if (this.activeViewTab === 'encashment') this.loadEncashmentData();
        if (this.activeViewTab === 'ledger') this.loadLedgerHistory();
      }
      if (this.allRequests.length > 0) {
        this.filterRequests();
      }
    });

    this.routeSub = this.route.queryParams.subscribe(params => {
      const empId = params['employeeId'];
      if (empId && String(empId) !== 'All') {
        this.selectedEmployeeId = Number(empId);
        this.selectedEmployeeName = params['employeeName'] || '';
        this.globalFilterService.setEmployee(Number(empId), this.selectedEmployeeName);
        this.loadLeaveBalance();
        if (this.allRequests.length > 0) {
          this.filterRequests();
        }
      }
      if (params['action'] === 'apply' || params['action'] === 'add') {
        setTimeout(() => {
          this.openApplyLeaveModal();
        }, 200);
      }
    });
  }

  ngOnDestroy() {
    if (this.filterSub) {
      this.filterSub.unsubscribe();
    }
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  loadHolidays() {
    this.holidayService.getHoliday().subscribe({
      next: (res: any) => {
        this.holidays = Array.isArray(res) ? res : (res?.data || []);
        if (this.allRequests.length > 0) {
          this.recalculateRequestDays();
        }
      },
      error: () => {
        this.holidays = [];
      }
    });
  }

  recalculateRequestDays() {
    for (const req of this.allRequests) {
      if (req.totalDays === undefined || req.totalDays === null || req.totalDays <= 0) {
        req.totalDays = this.emailService.calculateWorkingLeaveDays(req.startDate, req.endDate, req.leaveMode, this.holidays);
      }
    }
  }

  formatLeaveDuration(req: SubmittedLeaveRequest): string {
    const days = (req.totalDays !== undefined && req.totalDays !== null && req.totalDays > 0)
      ? req.totalDays
      : this.emailService.calculateWorkingLeaveDays(req.startDate, req.endDate, req.leaveMode, this.holidays);
    const suffix = days === 1 ? 'Day' : 'Days';
    return `${days} ${suffix}`;
  }

  loadLeaveBalance() {
    const targetEmpId = this.getTargetEmployeeId();

    this.emailService.getEmployeeLeaveBalance(targetEmpId).subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          const totalRemaining = list.reduce((sum: number, item: any) => sum + (Number(item.remainingDays) || 0), 0);
          this.availableBalanceDays = totalRemaining;
        } else {
          this.availableBalanceDays = 0;
        }
      },
      error: () => {
        this.availableBalanceDays = 0;
      }
    });
  }

  loadLeaveTypes() {
    this.leaveTypeService.getAllData().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        }

        if (rawList.length > 0) {
          this.leaveTypes = rawList.map((item: any, idx: number) => ({
            id: Number(item.id || item.leaveTypeId || (idx + 1)),
            leaveTypeName: item.leaveTypeName || item.leaveName || item.type || 'Leave'
          }));
        } else {
          this.leaveTypes = [];
        }
      },
      error: (err) => {
        console.error('Error loading leave types for requests:', err);
        this.leaveTypes = [];
      }
    });
  }

  loadData() {
    this.emailService.getData().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        } else if (res && Array.isArray(res.result)) {
          rawList = res.result;
        }

        // Filter out soft-deleted leave requests
        rawList = rawList.filter((item: any) => !item.isDeleted && item.isDeleted !== 1 && item.isDeleted !== '1');

        if (rawList.length > 0) {
          this.allRequests = rawList.map((item: any) => {
            const leaveTypeId = Number(item.leaveTypeId || item.leaveType || 1);
            const matchedType = this.leaveTypes.find(t => t.id === leaveTypeId);
            const typeName = item.leaveTypeName || item.leaveName || item.type || (matchedType ? matchedType.leaveTypeName : 'Standard Leave');

            const actionByVal = (item.actionBy !== undefined && item.actionBy !== null) ? Number(item.actionBy) : undefined;
            const statusStr = item.status ? String(item.status).trim() : 'Pending';

            const calculatedDays = (item.totalDays !== undefined && item.totalDays !== null && Number(item.totalDays) > 0)
              ? Number(item.totalDays)
              : this.emailService.calculateWorkingLeaveDays(item.startDate || item.fromDate, item.endDate || item.toDate, item.leaveMode, this.holidays);

            return {
              id: Number(item.id || item.leaveRequestId || item.leaveId || 0),
              employeeId: Number(item.employeeId || item.empId || item.requestedBy || item.userId || 0),
              startDate: item.startDate || item.fromDate || '',
              endDate: item.endDate || item.toDate || '',
              leaveReason: item.leaveReason || item.reason || item.comments || '',
              leaveTypeName: typeName,
              leaveTypeId: leaveTypeId,
              leaveMode: item.leaveMode || 'Full Day',
              totalDays: calculatedDays,
              status: statusStr,
              actionBy: actionByVal,
              actionDate: item.actionDate,
              rejectionReason: item.rejectionReason || '',
              isActive: item.isActive !== undefined ? (item.isActive === 1 || item.isActive === true ? 1 : 0) : 1,
              isDeleted: item.isDeleted === 1 || item.isDeleted === true ? 1 : 0,
              isLop: item.isLop === true || item.isLop === 1 || item.isLop === 'true',
              isSandwichApplied: item.isSandwichApplied === true || item.isSandwichApplied === 1,
              sandwichDays: Number(item.sandwichDays || 0),
              isConvertedFromLop: item.isConvertedFromLop === true || item.isConvertedFromLop === 1
            };
          });
        } else {
          this.allRequests = [];
        }

        this.recalculateStats();
        this.filterRequests();
      },
      error: (err) => {
        console.error('Error fetching leave requests from database:', err);
        this.allRequests = [];
        this.recalculateStats();
        this.filterRequests();
      }
    });
  }

  recalculateStats() {
    this.totalCount = this.allRequests.length;
    this.approvedCount = this.allRequests.filter(r => this.getStatusText(r) === 'Approved').length;
    this.pendingCount = this.allRequests.filter(r => this.getStatusText(r) === 'Pending').length;
    this.rejectedCount = this.allRequests.filter(r => this.getStatusText(r) === 'Rejected').length;
    this.cancelledCount = this.allRequests.filter(r => this.getStatusText(r) === 'Cancelled').length;
  }

  filterRequests() {
    let result = [...this.allRequests];

    // Filter by selected employee from global filter
    if (this.selectedEmployeeId && this.selectedEmployeeId !== 'All') {
      result = result.filter(r => Number(r.employeeId) === Number(this.selectedEmployeeId));
    }

    // Filter by Status Tab (Pending / Approved / Cancelled / Rejected / All)
    if (this.activeTab !== 'All') {
      result = result.filter(r => this.getStatusText(r) === this.activeTab);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        (r.leaveReason && r.leaveReason.toLowerCase().includes(q)) ||
        (r.leaveTypeName && r.leaveTypeName.toLowerCase().includes(q))
      );
    }

    if (this.selectedType !== 'All') {
      result = result.filter(r => (r.leaveTypeName || 'Annual Leave') === this.selectedType);
    }

    // Default Ordering: Descending (latest data showing at first)
    const getTime = (r: SubmittedLeaveRequest): number => {
      const d = r.startDate || r.applyDate || r.actionDate || r.createdDate || r.endDate;
      if (d) {
        const t = new Date(d).getTime();
        if (!isNaN(t)) return t;
      }
      return r.id || 0;
    };

    result.sort((a, b) => {
      const tA = getTime(a);
      const tB = getTime(b);
      const idA = a.id || 0;
      const idB = b.id || 0;

      if (this.sortOrder === 'asc') {
        return (tA - tB) || (idA - idB);
      } else {
        return (tB - tA) || (idB - idA);
      }
    });

    this.filteredRequests = result;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(startIndex, endIndex);
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

  openApplyLeaveModal() {
    if (this.isViewingOtherEmployee) {
      this.toastr.info('Leave requests can only be submitted by employees for themselves.', 'Supervisor View');
      return;
    }

    const dialogRef = this.dialog.open(LeaverequestComponent, {
      width: '860px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.loadLeaveBalance();
        this.loadData();
        this.loadBalanceBreakdown();
        this.loadLedgerHistory();
      }
    });
  }

  onExport() {
    if (typeof window === 'undefined') return;

    const headers = ['ID', 'Start Date', 'End Date', 'Leave Type', 'Reason', 'Status', 'Is LOP', 'Sandwich Days'];
    const rows = this.allRequests.map(r => [
      `"${r.id}"`,
      `"${r.startDate}"`,
      `"${r.endDate}"`,
      `"${r.leaveTypeName || 'Annual Leave'}"`,
      `"${r.leaveReason || ''}"`,
      `"${this.getStatusText(r)}"`,
      `"${r.isLop ? 'Yes' : 'No'}"`,
      `"${r.sandwichDays || 0}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leave_Requests_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  getStatusBadgeClass(req: SubmittedLeaveRequest): string {
    const text = this.getStatusText(req);
    if (text === 'Approved') return 'badge-approved';
    if (text === 'Rejected') return 'badge-rejected';
    if (text === 'Cancelled') return 'badge-cancelled';
    return 'badge-pending';
  }

  getStatusText(req: SubmittedLeaveRequest): string {
    const statusStr = (req.status || '').toLowerCase().trim();
    if (statusStr === 'approved') return 'Approved';
    if (statusStr === 'rejected') return 'Rejected';
    if (statusStr === 'cancelled') return 'Cancelled';
    return 'Pending';
  }

  canCancelLeave(req: SubmittedLeaveRequest): boolean {
    if (this.isViewingOtherEmployee) return false;
    if (req.employeeId && this.loggedInEmployeeId > 0 && Number(req.employeeId) !== Number(this.loggedInEmployeeId)) {
      return false;
    }
    const text = this.getStatusText(req);
    if (text === 'Pending') return true;
    if (text === 'Approved') {
      if (!req.startDate) return false;
      const leaveStart = new Date(req.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      leaveStart.setHours(0, 0, 0, 0);
      return leaveStart.getTime() >= today.getTime();
    }
    return false;
  }

  onCancelLeave(req: SubmittedLeaveRequest) {
    if (!this.canCancelLeave(req)) {
      this.toastr.warning('Approved leaves for previous days or dates that have already passed cannot be cancelled.', 'Action Prohibited');
      return;
    }

    const dialogRef = this.dialog.open(CancelLeaveModalComponent, {
      width: '480px',
      panelClass: 'custom-clean-dialog',
      data: {
        leaveId: req.id,
        leaveTypeName: req.leaveTypeName,
        startDate: req.startDate,
        endDate: req.endDate,
        reason: req.leaveReason
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res && res.confirmed) {
        this.emailService.cancelLeave(req.id, res.reason || 'Cancelled by Employee').subscribe({
          next: () => {
            this.toastr.success('Leave request cancelled successfully. Quota has been restored.', 'Cancelled');
            this.loadLeaveBalance();
            this.loadData();
            this.loadBalanceBreakdown();
            this.loadLedgerHistory();
          },
          error: (err: any) => {
            this.toastr.error(err?.error?.message || 'Failed to cancel leave request.', 'Error');
          }
        });
      }
    });
  }

  // Phase 5: Balance Breakdown
  loadBalanceBreakdown() {
    this.leaveLedgerService.getBalanceSummary(this.getTargetEmployeeId()).subscribe({
      next: (res: any) => {
        this.balanceSummaries = res?.data || (Array.isArray(res) ? res : []);
      },
      error: (err) => {
        console.error('Error loading balance breakdown:', err);
        this.balanceSummaries = [];
      }
    });
  }

  // Phase 5: LOP Conversions
  loadConversionData() {
    this.lopConversionService.getAll().subscribe({
      next: (res: any) => {
        let list: LopConversionItem[] = res?.data || (Array.isArray(res) ? res : []);
        const targetEmpId = this.getTargetEmployeeId();
        if (targetEmpId && !this.isViewingOtherEmployee) {
          list = list.filter(x => Number(x.employeeId) === targetEmpId);
        }
        this.conversionRequests = list;
      },
      error: () => {
        this.conversionRequests = [];
      }
    });

    this.lopConversionService.getEligibleLop(this.getTargetEmployeeId()).subscribe({
      next: (res: any) => {
        this.eligibleLopLeaves = res?.data || (Array.isArray(res) ? res : []);
        if (this.eligibleLopLeaves.length > 0 && !this.selectedConversionLopId) {
          this.selectedConversionLopId = this.eligibleLopLeaves[0].id;
          this.selectedConversionDays = this.eligibleLopLeaves[0].lopDays || this.eligibleLopLeaves[0].totalDays || 1;
        }
      },
      error: () => {
        this.eligibleLopLeaves = [];
      }
    });
  }

  onLopSelectChange() {
    const found = this.eligibleLopLeaves.find(l => l.id === Number(this.selectedConversionLopId));
    if (found) {
      this.selectedConversionDays = found.lopDays || found.totalDays || 1;
    }
  }

  submitLopConversion() {
    if (!this.selectedConversionLopId) {
      this.toastr.warning('Please select an eligible LOP leave request.', 'Validation');
      return;
    }
    if (!this.selectedConversionTargetLtId) {
      this.toastr.warning('Please select target paid leave type.', 'Validation');
      return;
    }
    if (!this.conversionReason || !this.conversionReason.trim()) {
      this.toastr.warning('Please enter reason for conversion.', 'Validation');
      return;
    }

    const payload = {
      employeeId: this.getTargetEmployeeId() || this.loggedInEmployeeId,
      originalLeaveRequestId: Number(this.selectedConversionLopId),
      targetLeaveTypeId: Number(this.selectedConversionTargetLtId),
      conversionDays: Number(this.selectedConversionDays),
      reason: this.conversionReason.trim()
    };

    this.lopConversionService.apply(payload).subscribe({
      next: () => {
        this.toastr.success('LOP conversion request submitted successfully for approval.', 'Submitted');
        this.conversionReason = '';
        this.loadConversionData();
        this.loadLeaveBalance();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to submit LOP conversion request.', 'Error');
      }
    });
  }

  approveConversion(id: number) {
    this.lopConversionService.approve(id).subscribe({
      next: () => {
        this.toastr.success('LOP conversion request approved and ledger balance updated.', 'Approved');
        this.loadConversionData();
        this.loadLeaveBalance();
        this.loadData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to approve LOP conversion.', 'Error');
      }
    });
  }

  rejectConversion(id: number) {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    this.lopConversionService.reject(id, reason || 'Rejected by Manager').subscribe({
      next: () => {
        this.toastr.info('LOP conversion request rejected.', 'Rejected');
        this.loadConversionData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to reject LOP conversion.', 'Error');
      }
    });
  }

  // Phase 5: Comp-Off
  loadCompOffData() {
    this.compOffService.getAll().subscribe({
      next: (res: any) => {
        let list: CompOffGrantItem[] = res?.data || (Array.isArray(res) ? res : []);
        const targetEmpId = this.getTargetEmployeeId();
        if (targetEmpId && !this.isViewingOtherEmployee) {
          list = list.filter(x => Number(x.employeeId) === targetEmpId);
        }
        this.compOffRequests = list;
      },
      error: () => {
        this.compOffRequests = [];
      }
    });

    this.compOffService.getEligibleDates(this.getTargetEmployeeId()).subscribe({
      next: (res: any) => {
        this.eligibleCompOffDates = res?.data || (Array.isArray(res) ? res : []);
      },
      error: () => {
        this.eligibleCompOffDates = [];
      }
    });
  }

  claimCompOff(item: CompOffEligibleDate) {
    const payload = {
      employeeId: this.getTargetEmployeeId() || this.loggedInEmployeeId,
      attendanceDate: item.attendanceDate,
      workedMinutes: item.workedMinutes,
      eligibleDays: item.eligibleDays,
      reason: this.compOffReason.trim() || `Worked on ${item.dayType} (${item.holidayName || item.attendanceDate})`
    };

    this.compOffService.apply(payload).subscribe({
      next: () => {
        this.toastr.success('Comp-Off claim submitted successfully for approval.', 'Submitted');
        this.compOffReason = '';
        this.loadCompOffData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to claim Comp-Off.', 'Error');
      }
    });
  }

  approveCompOff(id: number) {
    this.compOffService.approve(id).subscribe({
      next: () => {
        this.toastr.success('Comp-Off claim approved! Entitlement credited with 90-day validity.', 'Approved');
        this.loadCompOffData();
        this.loadLeaveBalance();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to approve Comp-Off.', 'Error');
      }
    });
  }

  rejectCompOff(id: number) {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    this.compOffService.reject(id, reason || 'Rejected by Manager').subscribe({
      next: () => {
        this.toastr.info('Comp-Off claim rejected.', 'Rejected');
        this.loadCompOffData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to reject Comp-Off.', 'Error');
      }
    });
  }

  // Phase 5: Leave Encashment
  loadEncashmentData() {
    this.leaveEncashmentService.getAll().subscribe({
      next: (res: any) => {
        let list: EncashmentRequestItem[] = res?.data || (Array.isArray(res) ? res : []);
        const targetEmpId = this.getTargetEmployeeId();
        if (targetEmpId && !this.isViewingOtherEmployee) {
          list = list.filter(x => Number(x.employeeId) === targetEmpId);
        }
        this.encashmentRequests = list;
      },
      error: () => {
        this.encashmentRequests = [];
      }
    });
  }

  submitEncashment() {
    if (!this.selectedEncashLtId) {
      this.toastr.warning('Please select a leave type to encash.', 'Validation');
      return;
    }
    if (!this.selectedEncashDays || this.selectedEncashDays <= 0) {
      this.toastr.warning('Please enter valid number of days to encash.', 'Validation');
      return;
    }
    if (!this.encashReason || !this.encashReason.trim()) {
      this.toastr.warning('Please enter reason for encashment.', 'Validation');
      return;
    }

    const payload = {
      employeeId: this.getTargetEmployeeId() || this.loggedInEmployeeId,
      leaveTypeId: Number(this.selectedEncashLtId),
      requestedDays: Number(this.selectedEncashDays),
      reason: this.encashReason.trim()
    };

    this.leaveEncashmentService.apply(payload).subscribe({
      next: () => {
        this.toastr.success('Leave encashment request submitted successfully for approval.', 'Submitted');
        this.encashReason = '';
        this.loadEncashmentData();
        this.loadLeaveBalance();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to submit leave encashment request.', 'Error');
      }
    });
  }

  approveEncashment(id: number) {
    this.leaveEncashmentService.approve(id).subscribe({
      next: () => {
        this.toastr.success('Leave encashment approved! Processed for payroll credit.', 'Approved');
        this.loadEncashmentData();
        this.loadLeaveBalance();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to approve leave encashment.', 'Error');
      }
    });
  }

  rejectEncashment(id: number) {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    this.leaveEncashmentService.reject(id, reason || 'Rejected by HR/Finance').subscribe({
      next: () => {
        this.toastr.info('Leave encashment request rejected.', 'Rejected');
        this.loadEncashmentData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to reject leave encashment.', 'Error');
      }
    });
  }

  // Phase 5: Ledger History
  loadLedgerHistory() {
    this.leaveLedgerService.getLedgerHistory(this.getTargetEmployeeId()).subscribe({
      next: (res: any) => {
        this.ledgerHistory = res?.data || (Array.isArray(res) ? res : []);
      },
      error: () => {
        this.ledgerHistory = [];
      }
    });
  }
}
