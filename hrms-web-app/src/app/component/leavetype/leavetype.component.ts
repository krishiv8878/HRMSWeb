import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { LeaveComponent } from '../../modal/leave/leave.component';

export interface LeaveTypeRecord {
  id: number;
  type?: string;
  leaveName?: string;
  leaveTypeName?: string;
  description?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-leavetype',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './leavetype.component.html',
  styleUrl: './leavetype.component.scss'
})
export class LeavetypeComponent implements OnInit {
  private leaveService = inject(LeavetypeService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  Math = Math;

  allLeaveTypes: LeaveTypeRecord[] = [];
  filteredLeaveTypes: LeaveTypeRecord[] = [];

  searchQuery: string = '';
  selectedStatus: string = 'All';

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedRecords: LeaveTypeRecord[] = [];

  // Metric Stats
  totalCount: number = 0;
  activeCount: number = 0;
  paidCount: number = 0;
  unpaidCount: number = 0;

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.leaveService.getAllData().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        }

        if (rawList.length > 0) {
          this.allLeaveTypes = rawList.map((item: any, idx: number) => ({
            id: Number(item.id || item.leaveTypeId || (idx + 1)),
            type: item.type || item.leaveTypeName || item.leaveName || 'General Leave',
            description: item.description || 'Employee corporate leave policy',
            isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false'
          }));
        } else {
          this.allLeaveTypes = [];
        }
        this.recalculateStats();
        this.filterRecords();
      },
      error: (err) => {
        console.error('Error fetching leave types from database:', err);
        this.allLeaveTypes = [];
        this.recalculateStats();
        this.filterRecords();
      }
    });
  }

  recalculateStats() {
    this.totalCount = this.allLeaveTypes.length;
    this.activeCount = this.allLeaveTypes.filter(l => l.isActive !== false).length;
    this.paidCount = this.allLeaveTypes.filter(l => !l.type?.toLowerCase().includes('unpaid')).length;
    this.unpaidCount = this.totalCount - this.paidCount;
  }

  filterRecords() {
    let result = [...this.allLeaveTypes];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        (r.type && r.type.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (this.selectedStatus !== 'All') {
      const isActiveFilter = this.selectedStatus === 'Active';
      result = result.filter(r => (r.isActive !== false) === isActiveFilter);
    }

    this.filteredLeaveTypes = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredLeaveTypes.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRecords = this.filteredLeaveTypes.slice(startIndex, endIndex);
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

  openAddForm() {
    const dialogRef = this.dialog.open(LeaveComponent, {
      width: '540px',
      maxWidth: '95vw',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllData();
      }
    });
  }

  Edit(data: any) {
    const dialogRef = this.dialog.open(LeaveComponent, {
      width: '540px',
      maxWidth: '95vw',
      autoFocus: false,
      data
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllData();
      }
    });
  }

  // Soft-toggle isActive status (Active true / false)
  onToggleActiveStatus(record: LeaveTypeRecord) {
    const nextState = record.isActive === false ? true : false;
    record.isActive = nextState;

    const payload = {
      id: record.id,
      leaveTypeId: record.id,
      type: record.type,
      leaveTypeName: record.type,
      leaveName: record.type,
      description: record.description,
      isActive: nextState
    };

    this.leaveService.updateData(payload).subscribe({
      next: () => {
        this.recalculateStats();
        if (nextState) {
          this.toastr.success(`Leave Type '${record.type}' set to Active`, 'Status Updated');
        } else {
          this.toastr.warning(`Leave Type '${record.type}' Inactivated`, 'Policy Inactivated');
        }
      },
      error: () => {
        this.recalculateStats();
        if (nextState) {
          this.toastr.success(`Leave Type '${record.type}' set to Active`, 'Status Updated');
        } else {
          this.toastr.warning(`Leave Type '${record.type}' Inactivated`, 'Policy Inactivated');
        }
      }
    });
  }

  getLeaveIcon(typeName?: string): string {
    if (!typeName) return 'event_note';
    const lower = typeName.toLowerCase();
    if (lower.includes('annual') || lower.includes('vacation')) return 'beach_access';
    if (lower.includes('sick') || lower.includes('medical')) return 'medical_services';
    if (lower.includes('casual')) return 'time_to_leave';
    if (lower.includes('maternity') || lower.includes('paternity') || lower.includes('parental')) return 'child_care';
    if (lower.includes('unpaid')) return 'money_off';
    return 'event_note';
  }
}
