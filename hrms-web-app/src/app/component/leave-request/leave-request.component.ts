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
  actionBy?: number;
  actionDate?: string;
  rejectionReason?: string;
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

  // Dynamic Metric Stats
  totalCount: number = 0;
  approvedCount: number = 0;
  pendingCount: number = 0;
  rejectedCount: number = 0;
  availableBalanceDays: number = 0;

  ngOnInit() {
    this.loadLeaveTypes();
    this.loadLeaveBalance();
    this.loadData();
  }

  loadLeaveBalance() {
    this.emailService.getEmployeeLeaveBalance().subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          const totalRemaining = list.reduce((sum: number, item: any) => sum + (Number(item.remainingDays) || 0), 0);
          this.availableBalanceDays = totalRemaining;
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

            return {
              id: Number(item.id || item.leaveRequestId || item.leaveId || 0),
              startDate: item.startDate || item.fromDate || '',
              endDate: item.endDate || item.toDate || '',
              leaveReason: item.leaveReason || item.reason || item.comments || '',
              leaveTypeName: typeName,
              leaveTypeId: leaveTypeId,
              leaveMode: item.leaveMode || 'Full Day',
              status: statusStr,
              actionBy: actionByVal,
              actionDate: item.actionDate,
              rejectionReason: item.rejectionReason || '',
              isActive: item.isActive !== undefined ? (item.isActive === 1 || item.isActive === true ? 1 : 0) : 1,
              isDeleted: item.isDeleted === 1 || item.isDeleted === true ? 1 : 0
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

  openApplyLeaveModal() {
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
      }
    });
  }

  onExport() {
    if (typeof window === 'undefined') return;

    const headers = ['ID', 'Start Date', 'End Date', 'Leave Type', 'Reason', 'Status'];
    const rows = this.allRequests.map(r => [
      `"${r.id}"`,
      `"${r.startDate}"`,
      `"${r.endDate}"`,
      `"${r.leaveTypeName || 'Annual Leave'}"`,
      `"${r.leaveReason || ''}"`,
      `"${this.getStatusText(r)}"`
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
    return 'badge-pending';
  }

  getStatusText(req: SubmittedLeaveRequest): string {
    const statusStr = (req.status || '').toLowerCase().trim();
    if (statusStr === 'approved') return 'Approved';
    if (statusStr === 'rejected') return 'Rejected';
    if (statusStr === 'cancelled') return 'Cancelled';
    return 'Pending';
  }
}
