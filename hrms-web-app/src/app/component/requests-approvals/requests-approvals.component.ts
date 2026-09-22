import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { EmailService } from '../../services/leaveRequest/email.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';
import { RequestsApprovalsModalComponent } from '../../modal/requests-approvals-modal/requests-approvals-modal.component';
import { TimesheetReviewModalComponent } from '../../modal/timesheet-review-modal/timesheet-review-modal.component';
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';
import { DocumentService } from '../../services/documnets/document.service';
import { TimesheetService } from '../../services/timesheet/timesheet.service';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { AssetTrackingModalComponent } from '../../modal/asset-tracking-modal/asset-tracking-modal.component';
import { CancelLeaveModalComponent } from '../../modal/cancel-leave-modal/cancel-leave-modal.component';
import { AssetItem } from '../../interface/asset.interface';
import { CandidateService } from '../../services/candidate/candidate.service';
import { CandidateInterviewModalComponent } from '../../modal/candidate-interview/candidate-interview.component';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { NotificationService } from '../../services/notification/notification.service';
import { GlobalFilterService } from '../../services/filter/global-filter.service';

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
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  actionBy?: number;
  actionDate?: string;
  rawRecord?: any;
  category: 'Leave' | 'Attendance' | 'Document' | 'Timesheet' | 'Asset' | 'Interview' | 'Banking' | 'Other';
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
export class RequestsApprovalsComponent implements OnInit, OnDestroy {
  private service = inject(EmailService);
  private service2 = inject(AttendanceRequestService);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);
  private dialog = inject(MatDialog);
  private documentService = inject(DocumentService);
  private timesheetService = inject(TimesheetService);
  private assetRequestService = inject(AssetRequestService);
  private candidateService = inject(CandidateService);
  private paymentInfoService = inject(PaymentinfoService);
  private notificationService = inject(NotificationService);
  private globalFilterService = inject(GlobalFilterService);
  private filterSub?: Subscription;

  get isApprover(): boolean {
    return this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
  }

  get isBankingApprover(): boolean {
    return this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);
  }

  Math = Math;

  activeCategory: 'action_required' | 'time_attendance' | 'timesheet' | 'asset' | 'hr_banking' = 'action_required';
  activeSubTab: string = 'all';
  activeTab: 'all' | 'leave' | 'attendance' | 'document' | 'timesheet' | 'asset' | 'interview' | 'banking' = 'all';
  searchQuery: string = '';
  selectedStatus: string = 'Pending';
  selectedEmployee: string = 'All';
  employeeOptions: string[] = [];

  allRequests: ApprovalRequestItem[] = [];
  filteredRequests: ApprovalRequestItem[] = [];
  paginatedRequests: ApprovalRequestItem[] = [];

  // Metrics Stats (100% Dynamic from DB)
  totalPendingCount: number = 0;
  leaveCount: number = 0;
  attendanceCount: number = 0;
  documentCount: number = 0;
  timesheetCount: number = 0;
  assetTicketCount: number = 0;
  interviewCount: number = 0;
  bankingCount: number = 0;
  processedTodayCount: number = 0;

  // Domain Counts
  totalLeaveAttendanceCount: number = 0;
  totalTimesheetCount: number = 0;
  totalAssetCount: number = 0;
  totalHrBankingCount: number = 0;

  // Domain Pending Counts
  pendingLeaveAttendanceCount: number = 0;
  pendingTimesheetCount: number = 0;
  pendingAssetCount: number = 0;
  pendingHrBankingCount: number = 0;
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

    this.filterSub = this.globalFilterService.filters$.subscribe(f => {
      this.searchQuery = f.search || '';
      if (f.status) this.selectedStatus = f.status;
      if (f.employeeName && f.employeeId !== 'All') {
        this.selectedEmployee = f.employeeName;
      } else if (f.employeeId === 'All') {
        this.selectedEmployee = 'All';
      }
      if (this.allRequests.length > 0) {
        this.filterRequests();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.filterSub) {
      this.filterSub.unsubscribe();
    }
  }

  loadAllRequests(): void {
    this.notificationService.refreshNotifications();
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
          const statusStr: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' = 
            rawStatus.toLowerCase() === 'approved' ? 'Approved' :
            (rawStatus.toLowerCase() === 'rejected' ? 'Rejected' :
            (rawStatus.toLowerCase() === 'cancelled' ? 'Cancelled' : 'Pending'));

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
                  const empName = x.employeeName || x.uploadedByName || x.ownerName || x.fullName || (x.employee ? `${x.employee.firstName || ''} ${x.employee.lastName || ''}`.trim() : '') || (x.employeeId ? `Employee #${x.employeeId}` : 'Employee');
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

                    finalizeWithAssetTickets([...combinedSoFar, ...tsItems]);
                  },
                  error: () => {
                    finalizeWithAssetTickets(combinedSoFar);
                  }
                });
              },
              error: () => {
                finalizeWithAssetTickets([...leaveItems, ...attItems]);
              }
            });
          },
          error: (err: any) => {
            console.error('Error fetching attendance requests from DB:', err);
            finalizeWithAssetTickets([...leaveItems]);
          }
        });
      },
      error: (err: any) => {
        console.error('Error fetching leave requests from DB:', err);
        finalizeWithAssetTickets([]);
      }
    });

    const finalizeWithAssetTickets = (currentItems: ApprovalRequestItem[]) => {
      this.assetRequestService.fetchRequests(this.isApprover ? undefined : loggedUserId).subscribe({
        next: (assetRes: any) => {
          const rawAssetList = Array.isArray(assetRes) ? assetRes : (assetRes?.data || []);
          const assetItems: ApprovalRequestItem[] = rawAssetList.map((a: any) => {
            const empName = a.employeeName || 'Employee';
            const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
            const s = (a.status || '').toLowerCase().trim();
            const statusStr: 'Pending' | 'Approved' | 'Rejected' =
              s.includes('reject') ? 'Rejected' :
              (s.includes('approved') || s.includes('completed') || s.includes('received') ? 'Approved' : 'Pending');

            return {
              id: Number(a.id),
              requesterName: empName,
              requesterRole: `Asset (${a.requestType || 'Service'})`,
              avatarUrl: undefined,
              initials: initials || 'AS',
              requestType: `${a.requestType || 'Asset'} - ${a.assetModel || ('Asset #' + a.assetId)}`,
              startDate: a.createdDate,
              endDate: a.updatedDate,
              durationText: a.createdDate ? new Date(a.createdDate).toLocaleDateString('en-GB') : 'Recent',
              reasonPreview: s.includes('reject')
                ? `Rejected: ${a.adminRemarks || a.remarks || 'No remarks provided'}`
                : (a.reason || a.description || `Ticket #${a.id} (${a.status})`),
              status: statusStr,
              actionBy: a.actionByEmployeeId,
              actionDate: a.updatedDate,
              category: 'Asset',
              rawRecord: {
                ...a,
                fullName: empName,
                category: 'Asset'
              }
            };
          });

          let combined = [...currentItems, ...assetItems];

          if (!this.isApprover && loggedUserId > 0) {
            combined = combined.filter(r => {
              const rec = r.rawRecord;
              if (rec?.employeeId) return Number(rec.employeeId) === loggedUserId;
              if (rec?.empId) return Number(rec.empId) === loggedUserId;
              return true;
            });
          }

          fetchCandidateInterviews(combined);
        },
        error: () => {
          let combined = [...currentItems];
          if (!this.isApprover && loggedUserId > 0) {
            combined = combined.filter(r => {
              const rec = r.rawRecord;
              if (rec?.employeeId) return Number(rec.employeeId) === loggedUserId;
              if (rec?.empId) return Number(rec.empId) === loggedUserId;
              return true;
            });
          }
          fetchCandidateInterviews(combined);
        }
      });
    };

    const fetchCandidateInterviews = (baseItems: ApprovalRequestItem[]) => {
      this.candidateService.getData().subscribe({
        next: (candRes: any) => {
          let candList: any[] = [];
          if (Array.isArray(candRes)) candList = candRes;
          else if (candRes?.data && Array.isArray(candRes.data)) candList = candRes.data;

          const interviewItems: ApprovalRequestItem[] = [];
          const loggedEmpId = loggedUserId;
          const loggedUserName = typeof window !== 'undefined' ? (localStorage.getItem('fullName') || localStorage.getItem('userName') || '').toLowerCase().trim() : '';

          candList.forEach((c: any, idx: number) => {
            if (c.isDeleted || c.stage === 'Rejected' || c.stage === 'Onboarded') return;

            let intId: number | undefined = undefined;
            let intName: string | undefined = undefined;
            let lastEvaluatedBy: string | undefined = undefined;
            let curRound: string = 'Interview Round';
            let intStatus: string = 'Scheduled';
            let intRemarks: string | undefined = undefined;
            let intRating: number | undefined = undefined;
            let intRec: string | undefined = undefined;
            let scheduledAt: string | undefined = undefined;

            if (c.relevantExperience && typeof c.relevantExperience === 'string' && c.relevantExperience.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(c.relevantExperience);
                intId = parsed.interviewerId ? Number(parsed.interviewerId) : undefined;
                intName = parsed.interviewerName || undefined;
                lastEvaluatedBy = parsed.lastEvaluatedBy || undefined;
                curRound = parsed.currentRound || parsed.round || 'Technical Interview';
                intStatus = parsed.status || 'Scheduled';
                intRemarks = parsed.remarks || parsed.interviewerRemarks;
                intRating = parsed.rating || parsed.interviewRating;
                intRec = parsed.recommendation || parsed.interviewRecommendation;
                scheduledAt = parsed.scheduledAt || parsed.evaluatedAt;
              } catch {}
            }

            const isAssignedToUser = (intId && loggedEmpId > 0 && intId === loggedEmpId) ||
              (intName && loggedUserName && intName.toLowerCase().includes(loggedUserName));

            const isFeedbackSubmitted = intStatus?.includes('Feedback Submitted') ||
              intStatus?.includes('Awaiting HR Review') ||
              intStatus === 'Pending HR Decision' ||
              Boolean(intRemarks);

            const isAdminOrHr = this.rbacService.isAdmin() || this.rbacService.isHR();
            // Interviewer only sees it when assigned and feedback has NOT been submitted yet. Once feedback is submitted, it is reassigned back to HR.
            const interviewerShouldSee = isAssignedToUser && !isFeedbackSubmitted;

            if (isAdminOrHr || interviewerShouldSee) {
              if (intId || intName || isFeedbackSubmitted || (c.stage && c.stage.toLowerCase().includes('interview'))) {
                const candName = `${c.firstName || 'Candidate'} ${c.lastName || ''}`.trim();
                const initials = ((c.firstName?.[0] || 'C') + (c.lastName?.[0] || 'D')).toUpperCase();
                const isCompleted = isFeedbackSubmitted;
                const evaluatorDisplay = lastEvaluatedBy || intName || 'Interviewer';

                interviewItems.push({
                  id: Number(c.id || (idx + 9000)),
                  requesterName: candName,
                  requesterRole: `Candidate (${c.appliedRole || 'Applicant'})`,
                  avatarUrl: undefined,
                  initials: initials,
                  requestType: curRound,
                  startDate: scheduledAt || c.lastUpdated || new Date().toISOString(),
                  endDate: scheduledAt || c.lastUpdated || new Date().toISOString(),
                  durationText: curRound,
                  reasonPreview: isCompleted
                    ? `Feedback logged by ${evaluatorDisplay}. Awaiting HR Review (${intRating ? intRating + '/5' : 'Rating logged'}: "${intRemarks || intRec || 'Feedback submitted'}").`
                    : `Assigned Interviewer: ${intName || 'You'}. Pending interview feedback submission.`,
                  status: isCompleted ? 'Approved' : 'Pending',
                  actionBy: intId,
                  actionDate: scheduledAt,
                  category: 'Interview',
                  rawRecord: {
                    ...c,
                    id: Number(c.id),
                    candidateId: Number(c.id),
                    currentRound: curRound,
                    interviewStatus: intStatus,
                    interviewerId: intId,
                    interviewerName: intName || lastEvaluatedBy,
                    interviewerRemarks: intRemarks,
                    interviewRating: intRating,
                    interviewRecommendation: intRec,
                    interviewHistory: (c.relevantExperience && typeof c.relevantExperience === 'string' && c.relevantExperience.trim().startsWith('{'))
                      ? (() => { try { return Array.isArray(JSON.parse(c.relevantExperience).history) ? JSON.parse(c.relevantExperience).history : []; } catch { return []; } })()
                      : [],
                    rawRelevantExperience: c.relevantExperience,
                    isCandidateInterview: true
                  }
                });
              }
            }
          });

          const allCombined = [...baseItems, ...interviewItems];
          fetchBankingRequests(allCombined);
        },
        error: () => {
          fetchBankingRequests(baseItems);
        }
      });
    };

    const fetchBankingRequests = (currentItems: ApprovalRequestItem[]) => {
      // Strictly restrict Banking requests to HR and Admin
      if (!this.isBankingApprover) {
        this.allRequests = currentItems;
        const names = Array.from(new Set(currentItems.map(r => r.requesterName).filter(n => n && n !== 'Employee'))).sort();
        this.employeeOptions = names;
        this.updateMetricsAndFilter();
        return;
      }

      this.employeeService.getData().subscribe({
        next: (empRes: any) => {
          let empList: any[] = [];
          if (Array.isArray(empRes)) empList = empRes;
          else if (empRes?.data && Array.isArray(empRes.data)) empList = empRes.data;

          const bankingItems: ApprovalRequestItem[] = [];
          empList.forEach((emp: any) => {
            if (emp.responsibilities) {
              try {
                const parsed = JSON.parse(emp.responsibilities);
                const req = parsed.pendingBankRequest;
                if (req) {
                  const statusStr: 'Pending' | 'Approved' | 'Rejected' =
                    req.status === 'Approved' ? 'Approved' : (req.status === 'Rejected' ? 'Rejected' : 'Pending');
                  const last4 = req.accountNumber ? String(req.accountNumber).slice(-4) : '••••';
                  const empName = req.employeeName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
                  const initials = ((emp.firstName?.[0] || 'E') + (emp.lastName?.[0] || '')).toUpperCase();

                  bankingItems.push({
                    id: Number(emp.id),
                    requesterName: empName,
                    requesterRole: `Banking (${req.isNewAccount ? 'New Direct Deposit' : 'Coordinate Update'})`,
                    avatarUrl: undefined,
                    initials: initials,
                    requestType: `Bank Details Update - ${req.bankName}`,
                    startDate: req.requestedAt,
                    endDate: req.requestedAt,
                    durationText: req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-GB') : 'Recent',
                    reasonPreview: `Bank: ${req.bankName} | A/C: •••• ${last4} | IFSC: ${req.ifscCode} | Beneficiary: ${req.nameOnAccount}`,
                    status: statusStr,
                    actionBy: req.actionBy,
                    actionDate: req.actionDate,
                    category: 'Banking',
                    rawRecord: {
                      ...req,
                      fullName: empName,
                      employeeRecord: emp,
                      category: 'Banking'
                    }
                  });
                }
              } catch {}
            }
          });

          const finalCombined = [...currentItems, ...bankingItems];
          this.allRequests = finalCombined;
          const names = Array.from(new Set(finalCombined.map(r => r.requesterName).filter(n => n && n !== 'Employee'))).sort();
          this.employeeOptions = names;
          this.updateMetricsAndFilter();
        },
        error: () => {
          this.allRequests = currentItems;
          const names = Array.from(new Set(currentItems.map(r => r.requesterName).filter(n => n && n !== 'Employee'))).sort();
          this.employeeOptions = names;
          this.updateMetricsAndFilter();
        }
      });
    };
  }

  formatDateRange(start?: string, end?: string): string {
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
    this.assetTicketCount = this.allRequests.filter(r => r.category === 'Asset').length;
    this.interviewCount = this.allRequests.filter(r => r.category === 'Interview').length;
    this.bankingCount = this.allRequests.filter(r => r.category === 'Banking').length;

    // Totals by Domain
    this.totalLeaveAttendanceCount = this.leaveCount + this.attendanceCount;
    this.totalTimesheetCount = this.timesheetCount;
    this.totalAssetCount = this.assetTicketCount;
    this.totalHrBankingCount = this.documentCount + this.bankingCount + this.interviewCount;

    // Pending by Domain
    this.pendingLeaveAttendanceCount = this.allRequests.filter(r => (r.category === 'Leave' || r.category === 'Attendance') && r.status === 'Pending').length;
    this.pendingTimesheetCount = this.allRequests.filter(r => r.category === 'Timesheet' && r.status === 'Pending').length;
    this.pendingAssetCount = this.allRequests.filter(r => r.category === 'Asset' && r.status === 'Pending').length;
    this.pendingHrBankingCount = this.allRequests.filter(r => (r.category === 'Document' || r.category === 'Banking' || r.category === 'Interview') && r.status === 'Pending').length;

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

  setCategory(cat: 'action_required' | 'time_attendance' | 'timesheet' | 'asset' | 'hr_banking'): void {
    this.activeCategory = cat;
    this.activeSubTab = 'all';
    this.currentPage = 1;
    if (cat === 'action_required') {
      this.selectedStatus = 'Pending';
    } else {
      this.selectedStatus = 'All';
    }
    this.filterRequests();
  }

  setSubTab(subTab: string): void {
    this.activeSubTab = subTab;
    this.currentPage = 1;
    this.filterRequests();
  }

  setTab(tab: 'all' | 'leave' | 'attendance' | 'document' | 'timesheet' | 'asset' | 'interview' | 'banking'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.filterRequests();
  }

  filterRequests(): void {
    let result = [...this.allRequests];

    // Filter by Active Category (Option A Hub)
    if (this.activeCategory === 'action_required') {
      result = result.filter(r => r.status === 'Pending');
      if (this.activeSubTab !== 'all') {
        result = result.filter(r => r.category.toLowerCase() === this.activeSubTab.toLowerCase());
      }
    } else if (this.activeCategory === 'time_attendance') {
      result = result.filter(r => r.category === 'Leave' || r.category === 'Attendance');
      if (this.activeSubTab === 'leave') {
        result = result.filter(r => r.category === 'Leave');
      } else if (this.activeSubTab === 'attendance') {
        result = result.filter(r => r.category === 'Attendance');
      }
    } else if (this.activeCategory === 'timesheet') {
      result = result.filter(r => r.category === 'Timesheet');
    } else if (this.activeCategory === 'asset') {
      result = result.filter(r => r.category === 'Asset');
    } else if (this.activeCategory === 'hr_banking') {
      result = result.filter(r => r.category === 'Document' || r.category === 'Banking' || r.category === 'Interview');
      if (this.activeSubTab === 'document') {
        result = result.filter(r => r.category === 'Document');
      } else if (this.activeSubTab === 'banking') {
        result = result.filter(r => r.category === 'Banking');
      } else if (this.activeSubTab === 'interview') {
        result = result.filter(r => r.category === 'Interview');
      }
    }

    if (this.selectedStatus !== 'All') {
      result = result.filter(r => r.status === this.selectedStatus);
    }

    if (this.selectedEmployee !== 'All') {
      result = result.filter(r => r.requesterName === this.selectedEmployee);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.requesterName.toLowerCase().includes(q) ||
        (r.requesterRole && r.requesterRole.toLowerCase().includes(q)) ||
        (r.reasonPreview && r.reasonPreview.toLowerCase().includes(q)) ||
        (r.requestType && r.requestType.toLowerCase().includes(q)) ||
        (r.durationText && r.durationText.toLowerCase().includes(q))
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
        } else if (item.category === 'Banking') {
          if (!this.isBankingApprover) {
            this.toaster.error('Only HR and Administrators are authorized to approve bank details requests.', 'Access Denied');
            return;
          }

          const req = item.rawRecord;
          const emp = req.employeeRecord || {};
          const loggedManagerName = typeof window !== 'undefined' ? (localStorage.getItem('fullName') || localStorage.getItem('userName') || 'HR/Manager') : 'HR/Manager';

          const bankPayload = {
            id: req.existingPaymentId || 0,
            employeeId: Number(req.employeeId),
            bankName: req.bankName,
            ifscCode: req.ifscCode,
            accountNumber: Number(req.accountNumber),
            nameOnAccount: req.nameOnAccount,
            isActive: true
          };

          const saveBankObs = (req.isNewAccount || !req.existingPaymentId)
            ? this.paymentInfoService.createData(bankPayload)
            : this.paymentInfoService.updateData(bankPayload);

          saveBankObs.subscribe({
            next: () => {
              let respObj: any = {};
              if (emp.responsibilities) {
                try { respObj = JSON.parse(emp.responsibilities); } catch {}
              }
              respObj.pendingBankRequest = {
                ...req,
                status: 'Approved',
                approvedBy: loggedManagerName,
                actionDate: new Date().toISOString()
              };
              const updatedEmp = {
                ...emp,
                responsibilities: JSON.stringify(respObj)
              };
              this.employeeService.updateData(updatedEmp).subscribe({
                next: () => {
                  this.toaster.success(`Bank details update for ${item.requesterName} Approved and active in payroll!`, 'Approved');
                  this.loadAllRequests();
                },
                error: () => {
                  this.toaster.success(`Bank details update for ${item.requesterName} Approved and active in payroll!`, 'Approved');
                  this.loadAllRequests();
                }
              });
            },
            error: (err: any) => {
              console.error('Error saving bank coordinates:', err);
              this.toaster.error('Failed to update bank details in payroll system.', 'Error');
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
        const loggedManagerName = typeof window !== 'undefined' ? (localStorage.getItem('fullName') || localStorage.getItem('userName') || 'HR/Manager') : 'HR/Manager';
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
        } else if (item.category === 'Banking') {
          if (!this.isBankingApprover) {
            this.toaster.error('Only HR and Administrators are authorized to reject bank details requests.', 'Access Denied');
            return;
          }

          const req = item.rawRecord;
          const emp = req.employeeRecord || {};

          let respObj: any = {};
          if (emp.responsibilities) {
            try { respObj = JSON.parse(emp.responsibilities); } catch {}
          }
          respObj.pendingBankRequest = {
            ...req,
            status: 'Rejected',
            rejectedBy: loggedManagerName,
            rejectionReason: reason,
            actionDate: new Date().toISOString()
          };
          const updatedEmp = {
            ...emp,
            responsibilities: JSON.stringify(respObj)
          };
          this.employeeService.updateData(updatedEmp).subscribe({
            next: () => {
              this.toaster.warning(`Bank details request for ${item.requesterName} Rejected.`, 'Rejected');
              this.loadAllRequests();
            },
            error: () => {
              this.toaster.warning(`Bank details request for ${item.requesterName} Rejected.`, 'Rejected');
              this.loadAllRequests();
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

  viewAssetDetails(item: ApprovalRequestItem): void {
    const raw = item.rawRecord || {};
    const asset = {
      id: Number(raw.assetId || 0),
      assetId: raw.assetId || 0,
      assetName: raw.assetModel || item.requestType || 'Company Asset',
      model: raw.assetModel || item.requestType || 'Company Asset',
      modelName: raw.assetModel || item.requestType || 'Company Asset',
      specifications: '',
      serialNumber: raw.serialNumber || 'N/A',
      assetType: raw.assetType || 'Equipment',
      assignedTo: item.requesterName || 'Assigned User',
      location: raw.location || 'Office',
      status: (raw.status || '').toLowerCase().includes('completed') ? 'Active' : 'In Repair',
      isActive: true,
      lastAudit: ''
    } as unknown as AssetItem;

    const dialogRef = this.dialog.open(AssetTrackingModalComponent, {
      width: '680px',
      data: {
        asset,
        request: raw,
        isAdmin: this.isApprover
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadAllRequests();
    });
  }

  onRowClick(item: ApprovalRequestItem): void {
    if (item.category === 'Asset') {
      this.viewAssetDetails(item);
    } else if (item.category === 'Timesheet') {
      this.reviewTimesheet(item);
    } else if (item.category === 'Interview') {
      this.openInterviewAction(item);
    } else if (item.category === 'Banking') {
      if (this.isBankingApprover && item.status === 'Pending') {
        this.approveRequest(item);
      }
    } else {
      if (this.isApprover && item.status === 'Pending') {
        this.approveRequest(item);
      }
    }
  }

  getTypeBadgeClass(type: string): string {
    const t = type.toUpperCase();
    if (t.includes('ANNUAL') || t.includes('PL') || t.includes('LEAVE')) return 'badge-type-annual';
    if (t.includes('SICK') || t.includes('CL')) return 'badge-type-sick';
    if (t.includes('EXPENSE')) return 'badge-type-expense';
    if (t.includes('SHIFT') || t.includes('CLOCK')) return 'badge-type-shift';
    if (t.includes('ASSET') || t.includes('REPAIR') || t.includes('REPLACE') || t.includes('RETURN')) return 'badge-type-asset';
    if (t.includes('DOC') || t.includes('VERIF')) return 'badge-type-doc';
    if (t.includes('INTERVIEW') || t.includes('ROUND')) return 'badge-type-interview';
    return 'badge-type-default';
  }

  openInterviewAction(item: ApprovalRequestItem): void {
    const raw = item.rawRecord || {};
    const candidateData: any = {
      id: Number(raw.id || item.id),
      candidateId: Number(raw.candidateId || raw.id || item.id),
      firstName: raw.firstName || item.requesterName?.split(' ')[0] || 'Candidate',
      lastName: raw.lastName || item.requesterName?.split(' ').slice(1).join(' ') || '',
      fullName: item.requesterName,
      emailAddress: raw.emailAddress || '—',
      mobileNumber: raw.mobileNumber || '—',
      appliedRole: raw.appliedRole || 'Applicant',
      stage: raw.stage || 'Technical Interview',
      totalExperience: raw.totalExperience || '0',
      relevantExperience: raw.relevantExperience || '{}',
      rawRelevantExperience: raw.rawRelevantExperience || raw.relevantExperience || '{}',
      interviewHistory: Array.isArray(raw.interviewHistory) ? raw.interviewHistory : [],
      currentSalary: raw.currentSalary,
      expectedSalary: raw.expectedSalary,
      rawCurrentSalary: raw.rawCurrentSalary,
      rawExpectedSalary: raw.rawExpectedSalary,
      currentRound: raw.currentRound || item.requestType,
      interviewStatus: raw.interviewStatus || (item.status === 'Approved' ? 'Feedback Submitted' : 'Scheduled'),
      interviewerId: raw.interviewerId,
      interviewerName: raw.interviewerName,
      interviewerRemarks: raw.interviewerRemarks,
      interviewRating: raw.interviewRating,
      interviewRecommendation: raw.interviewRecommendation,
      noticePeriod: raw.noticePeriod || 30,
      matchScore: raw.matchScore || 85
    };

    const dialogRef = this.dialog.open(CandidateInterviewModalComponent, {
      width: '680px',
      maxHeight: '90vh',
      data: { candidate: candidateData }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.loadAllRequests();
      }
    });
  }

  canCancelLeave(item: ApprovalRequestItem): boolean {
    if (item.category !== 'Leave') return false;
    const s = (item.status || '').toLowerCase();
    if (s !== 'pending' && s !== 'approved') return false;

    const loggedUserId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    const leaveEmpId = Number(item.rawRecord?.employeeId || item.rawRecord?.empId || 0);

    return (loggedUserId > 0 && leaveEmpId === loggedUserId) || this.rbacService.isAdmin() || this.rbacService.isHR();
  }

  cancelLeave(item: ApprovalRequestItem): void {
    const leaveId = Number(item.id || item.rawRecord?.id || item.rawRecord?.leaveRequestId);
    if (!leaveId) {
      this.toaster.error('Invalid leave request ID', 'Error');
      return;
    }

    const dialogRef = this.dialog.open(CancelLeaveModalComponent, {
      width: '480px',
      panelClass: 'custom-clean-dialog',
      data: {
        leaveId: leaveId,
        leaveTypeName: item.requestType,
        startDate: item.startDate,
        endDate: item.endDate,
        reason: item.reasonPreview
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res && res.confirmed) {
        this.service.cancelLeave(leaveId, res.reason || 'Cancelled by employee').subscribe({
          next: () => {
            this.toaster.success(`Leave request #${leaveId} has been cancelled and quota balance restored.`, 'Leave Cancelled');
            this.loadAllRequests();
          },
          error: (err: any) => {
            console.error('Error cancelling leave:', err);
            const msg = err?.error?.message || 'Failed to cancel leave request.';
            this.toaster.error(msg, 'Error');
          }
        });
      }
    });
  }
}
