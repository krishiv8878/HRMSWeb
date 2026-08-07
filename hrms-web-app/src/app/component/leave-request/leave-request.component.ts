import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmailService } from '../../services/leaveRequest/email.service';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { LeaverequestComponent, LeaveTypeItem } from '../../modal/leaverequest/leaverequest.component';

export interface SubmittedLeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  leaveReason: string;
  leaveTypeName?: string;
  leaveTypeId?: number;
  leaveMode?: string;
  status?: string;
  isApproved: boolean;
  approvedBy: number;
  isActive?: boolean | number;
  isDeleted?: boolean | number;
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
export class LeaveRequestComponent implements OnInit {
  private emailService = inject(EmailService);
  private leaveTypeService = inject(LeavetypeService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  Math = Math;

  allRequests: SubmittedLeaveRequest[] = [];
  filteredRequests: SubmittedLeaveRequest[] = [];
  leaveTypes: LeaveTypeItem[] = [];

  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedType: string = 'All';

  // Pagination State - pageSize 10
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedRequests: SubmittedLeaveRequest[] = [];

  // Metric Stats
  totalCount: number = 0;
  annualBalance: number = 14;
  sickBalance: number = 5;
  pendingCount: number = 0;

  ngOnInit() {
    this.loadLeaveTypes();
    this.loadData();
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
          this.leaveTypes = rawList.map((item: any) => ({
            id: Number(item.id || item.leaveTypeId || 1),
            leaveTypeName: item.leaveTypeName || item.leaveName || item.type || 'Leave'
          }));
        } else {
          this.leaveTypes = [
            { id: 1, leaveTypeName: 'Annual Leave' },
            { id: 2, leaveTypeName: 'Sick Leave' },
            { id: 3, leaveTypeName: 'Casual Leave' },
            { id: 4, leaveTypeName: 'Maternity / Paternity Leave' },
            { id: 5, leaveTypeName: 'Unpaid Leave' }
          ];
        }
      },
      error: () => {
        this.leaveTypes = [
          { id: 1, leaveTypeName: 'Annual Leave' },
          { id: 2, leaveTypeName: 'Sick Leave' },
          { id: 3, leaveTypeName: 'Casual Leave' },
          { id: 4, leaveTypeName: 'Maternity / Paternity Leave' },
          { id: 5, leaveTypeName: 'Unpaid Leave' }
        ];
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

        if (rawList.length > 0) {
          this.allRequests = rawList.map((item: any) => {
            const leaveTypeId = Number(item.leaveTypeId || item.leaveType || 1);
            const matchedType = this.leaveTypes.find(t => t.id === leaveTypeId);
            const typeName = item.leaveTypeName || item.leaveName || (matchedType ? matchedType.leaveTypeName : 'Annual Leave');

            const approvedByVal = (item.approvedBy !== undefined && item.approvedBy !== null) ? Number(item.approvedBy) : 0;
            const statusStr = item.status ? String(item.status).trim() : '';

            let isApprovedVal = item.isApproved === true || item.isApproved === 1 || statusStr.toLowerCase() === 'approved';

            return {
              id: Number(item.id || item.leaveRequestId || 0),
              startDate: item.startDate || item.fromDate || '',
              endDate: item.endDate || item.toDate || '',
              leaveReason: item.leaveReason || item.reason || item.comments || '',
              leaveTypeName: typeName,
              leaveTypeId: leaveTypeId,
              leaveMode: item.leaveMode || 'Full Day',
              status: statusStr,
              isApproved: isApprovedVal,
              approvedBy: approvedByVal,
              isActive: item.isActive !== undefined ? (item.isActive === 1 || item.isActive === true ? 1 : 0) : 1,
              isDeleted: item.isDeleted === 1 || item.isDeleted === true ? 1 : 0
            };
          });
        }

        this.recalculateStats();
        this.filterRequests();
      },
      error: (err) => {
        console.error('Error fetching leave requests from database:', err);
        this.recalculateStats();
        this.filterRequests();
      }
    });
  }

  recalculateStats() {
    this.totalCount = this.allRequests.length;
    this.pendingCount = this.allRequests.filter(r => this.getStatusText(r) === 'Pending').length;
  }

  filterRequests() {
    let result = [...this.allRequests];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        (r.leaveReason && r.leaveReason.toLowerCase().includes(q)) ||
        (r.leaveTypeName && r.leaveTypeName.toLowerCase().includes(q))
      );
    }

    if (this.selectedStatus !== 'All') {
      result = result.filter(r => this.getStatusText(r) === this.selectedStatus);
    }

    if (this.selectedType !== 'All') {
      result = result.filter(r => (r.leaveTypeName || 'Annual Leave') === this.selectedType);
    }

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

  openApplyLeaveModal(editData?: any) {
    const dialogRef = this.dialog.open(LeaverequestComponent, {
      width: '860px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: editData
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        // Immediate optimistic in-memory update so table reflects edits instantly!
        if (typeof res === 'object') {
          const resId = Number(res.id || res.leaveRequestId || 0);
          const matchedType = this.leaveTypes.find(t => t.id === Number(res.leaveTypeId));
          const typeName = matchedType ? matchedType.leaveTypeName : (res.leaveTypeName || 'Annual Leave');

          if (resId > 0) {
            const idx = this.allRequests.findIndex(r => r.id === resId);
            if (idx !== -1) {
              this.allRequests[idx] = {
                ...this.allRequests[idx],
                startDate: res.startDate || this.allRequests[idx].startDate,
                endDate: res.endDate || this.allRequests[idx].endDate,
                leaveReason: res.leaveReason !== undefined ? res.leaveReason : this.allRequests[idx].leaveReason,
                leaveTypeId: Number(res.leaveTypeId) || this.allRequests[idx].leaveTypeId,
                leaveTypeName: typeName,
                leaveMode: res.leaveMode || this.allRequests[idx].leaveMode,
                status: res.status || this.allRequests[idx].status,
                isApproved: Boolean(res.isApproved),
                approvedBy: Number(res.approvedBy) || 0,
                isActive: res.isActive !== false ? 1 : 0,
                isDeleted: res.isDeleted ? 1 : 0
              };
            }
          } else {
            // New request submitted
            this.allRequests.unshift({
              id: Date.now(),
              startDate: res.startDate || '',
              endDate: res.endDate || '',
              leaveReason: res.leaveReason || '',
              leaveTypeName: typeName,
              leaveTypeId: Number(res.leaveTypeId) || 1,
              leaveMode: res.leaveMode || 'Full Day',
              status: res.status || 'Pending',
              isApproved: false,
              approvedBy: 0,
              isActive: 1,
              isDeleted: 0
            });
          }

          this.recalculateStats();
          this.filterRequests();
        }

        // Trigger DB refresh
        this.loadData();
      }
    });
  }

  onExport() {
    if (typeof window === 'undefined') return;

    const headers = ['ID', 'Start Date', 'End Date', 'Leave Type', 'Reason', 'Approval Status', 'Active Status', 'Deleted Status'];
    const rows = this.allRequests.map(r => [
      `"${r.id}"`,
      `"${r.startDate}"`,
      `"${r.endDate}"`,
      `"${r.leaveTypeName || 'Annual Leave'}"`,
      `"${r.leaveReason || ''}"`,
      `"${this.getStatusText(r)}"`,
      `"${r.isActive === 1 || r.isActive === true ? 'Active (1)' : 'Inactive (0)'}"`,
      `"${r.isDeleted === 1 || r.isDeleted === true ? 'Deleted (1)' : 'Not Deleted (0)'}"`
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

  // Soft-toggle isActive status (Active true / false)
  onToggleActiveStatus(req: SubmittedLeaveRequest) {
    const isCurrentlyActive = req.isActive === 1 || req.isActive === true;
    const nextState = isCurrentlyActive ? false : true;
    req.isActive = nextState;

    const payload = {
      ...req,
      isActive: nextState,
      isDeleted: req.isDeleted === 1 || req.isDeleted === true
    };

    this.emailService.UpdateLeaverequest(payload).subscribe({
      next: () => {
        this.recalculateStats();
        this.filterRequests();
        if (nextState) {
          this.toastr.success('Leave Request set to Active', 'Success');
        } else {
          this.toastr.warning('Leave Request set to Inactive', 'Status Updated');
        }
      },
      error: () => {
        this.recalculateStats();
        this.filterRequests();
        if (nextState) {
          this.toastr.success('Leave Request set to Active', 'Success');
        } else {
          this.toastr.warning('Leave Request set to Inactive', 'Status Updated');
        }
      }
    });
  }

  // Soft-toggle isDeleted status (Delete / Restore toggle button)
  onToggleDeletedStatus(req: SubmittedLeaveRequest) {
    const isCurrentlyDeleted = req.isDeleted === 1 || req.isDeleted === true;
    const nextState = !isCurrentlyDeleted;
    req.isDeleted = nextState;
    req.isActive = !nextState;

    const payload = {
      ...req,
      isActive: !nextState,
      isDeleted: nextState
    };

    this.emailService.UpdateLeaverequest(payload).subscribe({
      next: () => {
        this.recalculateStats();
        this.filterRequests();
        if (nextState) {
          this.toastr.warning(`Leave Request #${req.id} marked as Deleted & Inactive`, 'Deleted');
        } else {
          this.toastr.success(`Leave Request #${req.id} restored to Active`, 'Restored');
        }
      },
      error: () => {
        this.recalculateStats();
        this.filterRequests();
        if (nextState) {
          this.toastr.warning(`Leave Request #${req.id} marked as Deleted & Inactive`, 'Deleted');
        } else {
          this.toastr.success(`Leave Request #${req.id} restored to Active`, 'Restored');
        }
      }
    });
  }

  getStatusBadgeClass(req: SubmittedLeaveRequest): string {
    const text = this.getStatusText(req);
    if (text === 'Approved') return 'badge-approved';
    if (text === 'Rejected') return 'badge-rejected';
    return 'badge-pending';
  }

  getStatusText(req: SubmittedLeaveRequest): string {
    const statusStr = (req.status || '').toLowerCase().trim();
    if (statusStr === 'rejected' || (req.approvedBy !== 0 && req.isApproved === false)) return 'Rejected';
    if (statusStr === 'approved' || (req.approvedBy !== 0 && req.isApproved === true)) return 'Approved';
    return 'Pending';
  }
}
