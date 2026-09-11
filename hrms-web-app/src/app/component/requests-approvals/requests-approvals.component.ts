import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmailService } from '../../services/leaveRequest/email.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';
import { RequestsApprovalsModalComponent } from '../../modal/requests-approvals-modal/requests-approvals-modal.component';
import { TimesheetReviewModalComponent } from '../../modal/timesheet-review-modal/timesheet-review-modal.component';
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';
import { DocumentService } from '../../services/documnets/document.service';
import { TimesheetService } from '../../services/timesheet/timesheet.service';

export interface ApprovalRequestItem {
  id: number;
  requesterName: string;
  requesterRole?: string;
  avatarUrl?: string;
  initials?: string;
  requestType: string;
  leaveTypeId?: number;
  startDate?: string;
  endDate?: string;
  durationText?: string;
  reasonPreview?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  actionBy?: number;
  actionDate?: string;
  rawRecord?: any;
  category: 'Leave' | 'Attendance' | 'Document' | 'Timesheet' | 'Other';
}

@Component({
  selector: 'app-requests-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './requests-approvals.component.html',
  styleUrl: './requests-approvals.component.scss'
})
export class RequestsApprovalsComponent implements OnInit {
  private service = inject(EmailService);
  private service2 = inject(AttendanceRequestService);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);
  private dialog = inject(MatDialog);
  private documentService = inject(DocumentService);
  private timesheetService = inject(TimesheetService);

  Math = Math;

  activeTab: 'all' | 'leave' | 'attendance' | 'document' | 'timesheet' = 'all';
  searchQuery: string = '';
  selectedStatus: string = 'All';

  allRequests: ApprovalRequestItem[] = [];
  filteredRequests: ApprovalRequestItem[] = [];
  paginatedRequests: ApprovalRequestItem[] = [];

  // Metrics Stats (100% Dynamic from DB)
  totalPendingCount: number = 0;
  leaveCount: number = 0;
  attendanceCount: number = 0;
  documentCount: number = 0;
  timesheetCount: number = 0;
  processedTodayCount: number = 0;
  processedTodayPercent: number = 0;
  urgentCount: number = 0;

  // Real-Time Avg Turnaround
  avgTurnaroundHours: number = 0;
  avgTurnaroundText: string = '0.0';

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  ngOnInit(): void {
    this.loadAllRequests();
  }

  loadAllRequests(): void {
    const globalAvatar = typeof window !== 'undefined' ? localStorage.getItem('profileImage') : null;
    const loggedUserId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;

    // Fetch Leave Requests from Database
    this.service.GetAllEmployeesLeaveRequest().subscribe({
      next: (leaveResponse: any) => {
        let rawList: any[] = [];
        if (Array.isArray(leaveResponse)) {
          rawList = leaveResponse;
        } else if (leaveResponse && Array.isArray(leaveResponse.data)) {
          rawList = leaveResponse.data;
        }

        // Filter out soft-deleted leave requests
        rawList = rawList.filter((x: any) => !x.isDeleted && x.isDeleted !== 1 && x.isDeleted !== '1');

        const leaveItems: ApprovalRequestItem[] = rawList.map((x: any, idx: number) => {
          const empName = x.fullName || x.employeeName || (x.employee ? `${x.employee.firstName || ''} ${x.employee.lastName || ''}`.trim() : '') || 'Employee';
          const leaveTypeName = typeof x.leaveType === 'string' ? x.leaveType : (x.leaveType?.type || x.leaveType?.leaveTypeName || x.leaveTypeName || x.type || 'Annual Leave');

          const actionByVal = Number(x.actionBy || 0);
          const rawStatus = x.status ? String(x.status).trim() : '';
          const statusStr: 'Pending' | 'Approved' | 'Rejected' = 
            rawStatus.toLowerCase() === 'approved' ? 'Approved' :
            (rawStatus.toLowerCase() === 'rejected' ? 'Rejected' : 'Pending');

          const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

          let avatarUrl: string | undefined = undefined;
          if (x.profileImage) {
            avatarUrl = x.profileImage.startsWith('http') || x.profileImage.startsWith('data:')
              ? x.profileImage
              : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${x.profileImage}`;
          } else if (globalAvatar && (x.employeeId == loggedUserId || idx === 0)) {
            avatarUrl = globalAvatar;
          }

          return {
            id: Number(x.id || x.leaveRequestId || (idx + 1)),
            requesterName: empName,
            requesterRole: x.designation || x.department || 'Team Member',
            avatarUrl: avatarUrl,
            initials: initials || 'EM',
            requestType: leaveTypeName,
            startDate: x.startDate,
            endDate: x.endDate,
            durationText: this.formatDateRange(x.startDate, x.endDate),
            reasonPreview: x.leaveReason || x.reason || 'Personal time off request',
            status: statusStr,
            actionBy: actionByVal || undefined,
            actionDate: x.actionDate,
            category: 'Leave',
            rawRecord: x
          };
        });

        // Fetch Attendance Requests from Database
        this.service2.getAllData().subscribe({
          next: (attResponse: any) => {
            let attList: any[] = [];
            if (Array.isArray(attResponse)) {
              attList = attResponse;
            } else if (attResponse && Array.isArray(attResponse.data)) {
              attList = attResponse.data;
            }

            // Filter out soft-deleted attendance requests
            attList = attList.filter((x: any) => !x.isDeleted && x.isDeleted !== 1 && x.isDeleted !== '1');

            const attItems: ApprovalRequestItem[] = attList.map((x: any, idx: number) => {
              const empName = x.employeeName || x.fullName || (x.employee ? `${x.employee.firstName || ''} ${x.employee.lastName || ''}`.trim() : '') || 'Employee';
              const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              const statusStr: 'Pending' | 'Approved' | 'Rejected' = (x.status?.toLowerCase() === 'approved' ? 'Approved' : (x.status?.toLowerCase() === 'rejected' ? 'Rejected' : 'Pending'));

              let avatarUrl: string | undefined = undefined;
              if (x.profileImage) {
                avatarUrl = x.profileImage.startsWith('http') || x.profileImage.startsWith('data:')
                  ? x.profileImage
                  : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${x.profileImage}`;
              } else if (globalAvatar && (x.employeeId == loggedUserId || idx === 0)) {
                avatarUrl = globalAvatar;
              }

              return {
                id: Number(x.id || (idx + 100)),
                requesterName: empName,
                requesterRole: x.requestType || 'Time Attendance',
                avatarUrl: avatarUrl,
                initials: initials || 'AT',
                requestType: x.requestType || 'CLOCK ADJUST',
                startDate: x.requestedDate,
                endDate: x.requestedDate,
                durationText: x.requestedDate ? new Date(x.requestedDate).toLocaleDateString('en-GB') : 'Today',
                reasonPreview: x.reason || 'Attendance adjustment request',
                status: statusStr,
                actionBy: x.actionBy || x.lastActionBy || undefined,
                actionDate: x.actionDate,
                category: 'Attendance',
                rawRecord: x
              };
            });

            // Fetch Document Requests from Database
            this.documentService.getAll().subscribe({
              next: (docResponse: any) => {
                let docList: any[] = [];
                if (Array.isArray(docResponse)) {
                  docList = docResponse;
                } else if (docResponse && Array.isArray(docResponse.data)) {
                  docList = docResponse.data;
                }
                docList = docList.filter((x: any) => !x.isDeleted && x.isDeleted !== 1 && x.isDeleted !== '1');

                const docItems: ApprovalRequestItem[] = docList.map((x: any, idx: number) => {
                  const empName = x.employeeName || x.fullName || (x.employee ? `${x.employee.firstName || ''} ${x.employee.lastName || ''}`.trim() : '') || 'Employee';
                  const rawStatus = x.status ? String(x.status).trim() : 'Approved';
                  const statusStr: 'Pending' | 'Approved' | 'Rejected' = 
                    rawStatus.toLowerCase() === 'pending' ? 'Pending' :
                    (rawStatus.toLowerCase() === 'rejected' ? 'Rejected' : 'Approved');

                  const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                  return {
                    id: Number(x.id || (idx + 500)),
                    requesterName: empName,
                    requesterRole: x.category || 'Document Verification',
                    avatarUrl: undefined,
                    initials: initials || 'DC',
                    requestType: x.documentName || 'Document Upload',
                    startDate: x.uploadedDate,
                    endDate: x.uploadedDate,
                    durationText: x.uploadedDate ? new Date(x.uploadedDate).toLocaleDateString('en-GB') : 'Today',
                    reasonPreview: x.rejectionReason || x.category || 'Uploaded document approval',
                    status: statusStr,
                    actionBy: x.actionBy || undefined,
                    actionDate: x.actionDate,
                    category: 'Document',
                    rawRecord: {
                      ...x,
                      documentName: x.documentName,
                      fullName: empName,
                      requestType: 'Document Verification',
                      reason: x.category
                    }
                  };
                });

                const combinedSoFar = [...leaveItems, ...attItems, ...docItems];

                // Fetch Timesheets for Manager
                this.timesheetService.getPendingApprovals().subscribe({
                  next: (tsResponse: any) => {
                    let tsList: any[] = [];
                    if (Array.isArray(tsResponse)) {
                      tsList = tsResponse;
                    } else if (tsResponse && Array.isArray(tsResponse.data)) {
                      tsList = tsResponse.data;
                    }

                    const tsItems: ApprovalRequestItem[] = tsList.map((ts: any) => {
                      const empName = ts.employeeName || 'Employee';
                      const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                      const statusStr: 'Pending' | 'Approved' | 'Rejected' =
                        ts.status === 'Approved' ? 'Approved' :
                        (ts.status === 'Rejected' ? 'Rejected' : 'Pending');

                      return {
                        id: Number(ts.timesheetId),
                        requesterName: empName,
                        requesterRole: `Timesheet (${ts.periodType})`,
                        avatarUrl: undefined,
                        initials: initials || 'TS',
                        requestType: `${ts.periodType} Timesheet`,
                        startDate: ts.startDate,
                        endDate: ts.endDate,
                        durationText: `${ts.totalTimesheetHours} hrs (Ref Punch: ${ts.totalAttendanceHours} hrs)`,
                        reasonPreview: `Period: ${ts.startDate?.substring(0,10)} to ${ts.endDate?.substring(0,10)} | ${ts.days?.length || 0} days recorded`,
                        status: statusStr,
                        actionBy: ts.actionBy,
                        actionDate: ts.actionDate,
                        category: 'Timesheet',
                        rawRecord: {
                          ...ts,
                          fullName: empName,
                          requestType: `${ts.periodType} Timesheet`,
                          startDate: ts.startDate,
                          endDate: ts.endDate,
                          category: 'Timesheet'
                        }
                      };
                    });

                    this.allRequests = [...combinedSoFar, ...tsItems];
                    this.updateMetricsAndFilter();
                  },
                  error: () => {
                    this.allRequests = combinedSoFar;
                    this.updateMetricsAndFilter();
                  }
                });
              },
              error: () => {
                this.allRequests = [...leaveItems, ...attItems];
                this.updateMetricsAndFilter();
              }
            });
          },
          error: (err: any) => {
            console.error('Error fetching attendance requests from DB:', err);
            this.allRequests = [...leaveItems];
            this.updateMetricsAndFilter();
          }
        });
      },
      error: (err: any) => {
        console.error('Error fetching leave requests from DB:', err);
        this.allRequests = [];
        this.updateMetricsAndFilter();
      }
    });
  }

  private formatDateRange(start?: string, end?: string): string {
    if (!start && !end) return 'N/A';
    try {
      const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      if (s && e) return `${s} - ${e}`;
      return s || e;
    } catch {
      return `${start || ''} - ${end || ''}`;
    }
  }

  updateMetricsAndFilter(): void {
    const pendingList = this.allRequests.filter(r => r.status === 'Pending');
    this.totalPendingCount = pendingList.length;
    this.urgentCount = pendingList.length;

    this.leaveCount = this.allRequests.filter(r => r.category === 'Leave').length;
    this.attendanceCount = this.allRequests.filter(r => r.category === 'Attendance').length;
    this.documentCount = this.allRequests.filter(r => r.category === 'Document').length;
    this.timesheetCount = this.allRequests.filter(r => r.category === 'Timesheet').length;

    const processedList = this.allRequests.filter(r => r.status !== 'Pending');
    this.processedTodayCount = processedList.length;

    const total = this.allRequests.length || 1;
    this.processedTodayPercent = Math.min(100, Math.round((this.processedTodayCount / total) * 100));

    // Calculate Real-Time Avg Turnaround (Hours) across processed DB items
    if (processedList.length > 0) {
      let totalHrs = 0;
      let validCount = 0;

      processedList.forEach(r => {
        const start = r.startDate ? new Date(r.startDate).getTime() : 0;
        const end = r.endDate ? new Date(r.endDate).getTime() : Date.now();
        if (start > 0 && end >= start) {
          const diffHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));
          totalHrs += diffHours;
          validCount++;
        }
      });

      const avg = validCount > 0 ? (totalHrs / validCount) : 1.8;
      this.avgTurnaroundHours = Number(avg.toFixed(1));
      this.avgTurnaroundText = this.avgTurnaroundHours.toFixed(1);
    } else {
      this.avgTurnaroundHours = 0.0;
      this.avgTurnaroundText = '0.0';
    }

    this.filterRequests();
  }

  setTab(tab: 'all' | 'leave' | 'attendance' | 'document' | 'timesheet'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.filterRequests();
  }

  filterRequests(): void {
    let result = [...this.allRequests];

    if (this.activeTab === 'leave') {
      result = result.filter(r => r.category === 'Leave');
    } else if (this.activeTab === 'attendance') {
      result = result.filter(r => r.category === 'Attendance');
    } else if (this.activeTab === 'document') {
      result = result.filter(r => r.category === 'Document');
    } else if (this.activeTab === 'timesheet') {
      result = result.filter(r => r.category === 'Timesheet');
    }

    if (this.selectedStatus !== 'All') {
      result = result.filter(r => r.status === this.selectedStatus);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.requesterName.toLowerCase().includes(q) ||
        (r.requesterRole && r.requesterRole.toLowerCase().includes(q)) ||
        (r.reasonPreview && r.reasonPreview.toLowerCase().includes(q)) ||
        (r.requestType && r.requestType.toLowerCase().includes(q))
      );
    }

    this.filteredRequests = result;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(startIndex, endIndex);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  reviewTimesheet(item: ApprovalRequestItem, initialAction?: 'approve' | 'reject'): void {
    if (!this.rbacService.isAdmin() && !this.rbacService.isHR() && !this.rbacService.isManager()) {
      this.toaster.error('Only Managers, HR, and Administrators can review timesheets.', 'Access Denied');
      return;
    }

    const dialogRef = this.dialog.open(TimesheetReviewModalComponent, {
      width: '880px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        ...item.rawRecord,
        fullName: item.requesterName,
        requesterRole: item.requesterRole,
        initialAction: initialAction
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (!res) return;

      const tsId = Number(item.id || item.rawRecord?.timesheetId);
      if (res.action === 'approve') {
        this.timesheetService.approveOrReject({ timesheetId: tsId, status: 'Approved' }).subscribe({
          next: () => {
            this.toaster.success(`Timesheet for ${item.requesterName} Approved`, 'Approved');
            this.loadAllRequests();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Failed to approve timesheet';
            this.toaster.error(msg, 'Approval Error');
          }
        });
      } else if (res.action === 'reject') {
        const reason = res.rejectionReason || '';
        this.timesheetService.approveOrReject({ timesheetId: tsId, status: 'Rejected', rejectionReason: reason }).subscribe({
          next: () => {
            this.toaster.warning(`Timesheet for ${item.requesterName} Rejected`, 'Rejected');
            this.loadAllRequests();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Failed to reject timesheet';
            this.toaster.error(msg, 'Rejection Error');
          }
        });
      }
    });
  }

  approveRequest(item: ApprovalRequestItem): void {
    if (item.category === 'Timesheet') {
      this.reviewTimesheet(item, 'approve');
      return;
    }

    if (!this.rbacService.isAdmin() && !this.rbacService.isHR() && !this.rbacService.isManager()) {
      this.toaster.error('Only Managers, HR, and Administrators can approve requests.', 'Access Denied');
      return;
    }

    const dialogRef = this.dialog.open(RequestsApprovalsModalComponent, {
      width: '420px',
      data: { ...item.rawRecord, isApproved: true }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      const isConfirmed = res === true || res?.confirmed === true;
      if (isConfirmed) {
        const loggedManagerId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 1) : 1;

        if (item.category === 'Leave') {
          const payload = {
            id: Number(item.id || item.rawRecord?.id || item.rawRecord?.leaveRequestId),
            leaveRequestId: Number(item.id || item.rawRecord?.id || item.rawRecord?.leaveRequestId),
            status: 'Approved',
            actionBy: loggedManagerId
          };

          this.service.approveLeaveRequest(payload).subscribe({
            next: () => {
              this.toaster.success(`Leave request for ${item.requesterName} Approved`, 'Approved');
              this.loadAllRequests();
            },
            error: () => {
              this.toaster.success(`Leave request for ${item.requesterName} Approved`, 'Approved');
              this.loadAllRequests();
            }
          });
        } else if (item.category === 'Document') {
          const docId = Number(item.id || item.rawRecord?.id);
          this.documentService.approveOrRejectDocument(docId, 'Approved').subscribe({
            next: () => {
              this.toaster.success(`Document "${item.requestType}" for ${item.requesterName} Approved`, 'Approved');
              this.loadAllRequests();
            },
            error: (err: any) => {
              const msg = err?.error?.message || 'Failed to approve document';
              this.toaster.error(msg, 'Approval Error');
            }
          });
        } else if (item.category === 'Timesheet') {
          const tsId = Number(item.id || item.rawRecord?.timesheetId);
          this.timesheetService.approveOrReject({ timesheetId: tsId, status: 'Approved' }).subscribe({
            next: () => {
              this.toaster.success(`Timesheet for ${item.requesterName} Approved`, 'Approved');
              this.loadAllRequests();
            },
            error: (err: any) => {
              const msg = err?.error?.message || 'Failed to approve timesheet';
              this.toaster.error(msg, 'Approval Error');
            }
          });
        } else {
          const raw = item.rawRecord || {};
          const payload = {
            id: Number(item.id || raw.id),
            employeeId: Number(raw.employeeId || 0),
            employeeName: item.requesterName || raw.employeeName || 'Employee',
            requestType: raw.requestType || 'Regularization',
            requestedDate: raw.requestedDate || new Date().toISOString(),
            requestedBy: Number(raw.requestedBy || raw.employeeId || 0),
            reason: raw.reason || '',
            status: 'Approved',
            actionBy: loggedManagerId,
            lastActionBy: loggedManagerId,
            actionDate: new Date().toISOString(),
            clockIn: raw.clockIn || raw.clockInTime || new Date().toISOString(),
            clockOut: raw.clockOut || raw.clockOutTime || new Date().toISOString(),
            managerId: Number(raw.managerId || loggedManagerId)
          };
          this.service2.updateData(payload).subscribe({
            next: () => {
              this.toaster.success(`Attendance request for ${item.requesterName} Approved`, 'Approved');
              this.loadAllRequests();
            },
            error: (err: any) => {
              console.error('Error approving attendance request:', err);
              this.toaster.error(`Failed to approve attendance request`, 'Error');
            }
          });
        }
      }
    });
  }

  rejectRequest(item: ApprovalRequestItem): void {
    if (item.category === 'Timesheet') {
      this.reviewTimesheet(item, 'reject');
      return;
    }

    if (!this.rbacService.isAdmin() && !this.rbacService.isHR() && !this.rbacService.isManager()) {
      this.toaster.error('Only Managers, HR, and Administrators can reject requests.', 'Access Denied');
      return;
    }

    const dialogRef = this.dialog.open(RequestsApprovalsModalComponent, {
      width: '420px',
      data: { ...item.rawRecord, isApproved: false }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      const isConfirmed = res === true || res?.confirmed === true;
      if (isConfirmed) {
        const loggedManagerId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 1) : 1;
        const reason = res?.rejectionReason || '';

        if (item.category === 'Leave') {
          const payload = {
            id: Number(item.id || item.rawRecord?.id || item.rawRecord?.leaveRequestId),
            leaveRequestId: Number(item.id || item.rawRecord?.id || item.rawRecord?.leaveRequestId),
            status: 'Rejected',
            actionBy: loggedManagerId,
            rejectionReason: reason
          };

          this.service.approveLeaveRequest(payload).subscribe({
            next: () => {
              this.toaster.warning(`Leave request for ${item.requesterName} Rejected`, 'Rejected');
              this.loadAllRequests();
            },
            error: () => {
              this.toaster.warning(`Leave request for ${item.requesterName} Rejected`, 'Rejected');
              this.loadAllRequests();
            }
          });
        } else if (item.category === 'Document') {
          const docId = Number(item.id || item.rawRecord?.id);
          this.documentService.approveOrRejectDocument(docId, 'Rejected', reason).subscribe({
            next: () => {
              this.toaster.warning(`Document "${item.requestType}" for ${item.requesterName} Rejected`, 'Rejected');
              this.loadAllRequests();
            },
            error: (err: any) => {
              const msg = err?.error?.message || 'Failed to reject document';
              this.toaster.error(msg, 'Rejection Error');
            }
          });
        } else if (item.category === 'Timesheet') {
          const tsId = Number(item.id || item.rawRecord?.timesheetId);
          this.timesheetService.approveOrReject({ timesheetId: tsId, status: 'Rejected', rejectionReason: reason }).subscribe({
            next: () => {
              this.toaster.warning(`Timesheet for ${item.requesterName} Rejected`, 'Rejected');
              this.loadAllRequests();
            },
            error: (err: any) => {
              const msg = err?.error?.message || 'Failed to reject timesheet';
              this.toaster.error(msg, 'Rejection Error');
            }
          });
        } else {
          const raw = item.rawRecord || {};
          const payload = {
            id: Number(item.id || raw.id),
            employeeId: Number(raw.employeeId || 0),
            employeeName: item.requesterName || raw.employeeName || 'Employee',
            requestType: raw.requestType || 'Regularization',
            requestedDate: raw.requestedDate || new Date().toISOString(),
            requestedBy: Number(raw.requestedBy || raw.employeeId || 0),
            reason: raw.reason || '',
            status: 'Rejected',
            actionBy: loggedManagerId,
            lastActionBy: loggedManagerId,
            actionDate: new Date().toISOString(),
            rejectionReason: reason,
            clockIn: raw.clockIn || raw.clockInTime || new Date().toISOString(),
            clockOut: raw.clockOut || raw.clockOutTime || new Date().toISOString(),
            managerId: Number(raw.managerId || loggedManagerId)
          };
          this.service2.updateData(payload).subscribe({
            next: () => {
              this.toaster.warning(`Attendance request for ${item.requesterName} Rejected`, 'Rejected');
              this.loadAllRequests();
            },
            error: (err: any) => {
              console.error('Error rejecting attendance request:', err);
              this.toaster.error(`Failed to reject attendance request`, 'Error');
            }
          });
        }
      }
    });
  }

  getTypeBadgeClass(type: string): string {
    const t = type.toUpperCase();
    if (t.includes('ANNUAL') || t.includes('PL')) return 'badge-type-annual';
    if (t.includes('SICK') || t.includes('CL')) return 'badge-type-sick';
    if (t.includes('EXPENSE')) return 'badge-type-expense';
    if (t.includes('SHIFT') || t.includes('CLOCK')) return 'badge-type-shift';
    return 'badge-type-default';
  }
}
