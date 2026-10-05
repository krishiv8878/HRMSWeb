import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { RbacService } from '../../core/rbac.service';
import { AttendanceStateService } from '../../services/attendance/attendance-state.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { EmailService } from '../../services/leaveRequest/email.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';
import { TimesheetService } from '../../services/timesheet/timesheet.service';
import { CandidateService } from '../../services/candidate/candidate.service';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { ProjectsService } from '../../services/project/projects.service';
import { DocumentService } from '../../services/documnets/document.service';

import { EmployeeAttendComponent } from '../../modal/employee-attend/employee-attend.component';
import { LeaverequestComponent } from '../../modal/leaverequest/leaverequest.component';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';

export interface LeaveBalanceWidget {
  type: string;
  allowed: number;
  used: number;
  remaining: number;
  percentage: number;
  colorClass: string;
}

export interface DirectReportStatus {
  id: number;
  name: string;
  initials: string;
  designation: string;
  avatarUrl?: string;
  status: 'Clocked In' | 'Present' | 'Late' | 'On Leave' | 'Absent';
  clockInTime?: string;
  hoursWorked?: string;
  leaveType?: string;
}

export interface PendingApprovalItem {
  id: number;
  requesterName: string;
  requesterRole?: string;
  avatarUrl?: string;
  initials: string;
  category: 'Leave' | 'Attendance' | 'Timesheet' | 'Asset' | 'Document';
  title: string;
  dateStr: string;
  reason?: string;
  rawItem: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  public rbacService = inject(RbacService);
  public attendanceStateService = inject(AttendanceStateService);
  private employeeService = inject(EmployeeService);
  private attendanceService = inject(EmployeeeService);
  private leaveService = inject(EmailService);
  private attenRequestService = inject(AttendanceRequestService);
  private timesheetService = inject(TimesheetService);
  private candidateService = inject(CandidateService);
  private assetService = inject(AssetsmasterService);
  private assetRequestService = inject(AssetRequestService);
  private holidayService = inject(HolidayservicesService);
  private projectService = inject(ProjectsService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private toaster = inject(ToastrService);

  private subs = new Subscription();

  Math = Math;

  // Role & View State
  primaryRole: 'Admin' | 'HR' | 'Manager' | 'Employee' = 'Employee';
  activeView: 'organization' | 'team' | 'employee' = 'employee';
  canSwitchView: boolean = false;
  viewOptions: { id: 'organization' | 'team' | 'employee'; label: string; icon: string }[] = [];

  // Logged-in User Info
  loggedInEmployeeId: number = 0;
  userName: string = 'User';
  userFirstName: string = 'User';
  userDesignation: string = 'Team Member';
  userEmployeeCode: string = '';
  userAvatar: string | null = null;
  greetingTime: string = 'Good Day';
  todayFormatted: string = '';

  // Data Loading
  isLoading: boolean = true;

  // Cached Raw Data for Modals
  cachedAttendanceAll: any[] = [];
  cachedAttendanceLogs: any[] = [];
  cachedLeavesAll: any[] = [];
  cachedAttenRequests: any[] = [];
  cachedHolidays: any[] = [];
  currentUserJoiningDate: Date | null = null;
  currentUserJoiningDateStr: string = '';

  // Real-Time Clock State (from AttendanceStateService & Today Attendance)
  isClockedIn: boolean = false;
  hasClockedOutToday: boolean = false;
  sessionElapsedDisplay: string = '00h 00m 00s';
  todayTotalHoursDisplay: string = '00h 00m 00s';
  clockInTimeDisplay: string = '--';
  clockOutTimeDisplay: string = '--';

  // 1. ADMIN & HR OVERVIEW METRICS
  totalEmployees: number = 0;
  activeEmployees: number = 0;
  inactiveEmployees: number = 0;
  newJoineesThisMonth: number = 0;

  presentTodayCount: number = 0;
  clockedInNowCount: number = 0;
  lateTodayCount: number = 0;
  absentTodayCount: number = 0;
  onLeaveTodayCount: number = 0;
  attendanceRatePercent: number = 0;

  totalPendingApprovals: number = 0;
  pendingLeavesCount: number = 0;
  pendingAttendanceCount: number = 0;
  pendingTimesheetsCount: number = 0;
  pendingAssetTicketsCount: number = 0;
  pendingDocumentsCount: number = 0;

  totalCandidatesCount: number = 0;
  candidatesInterviewCount: number = 0;
  candidatesOfferCount: number = 0;

  totalAssetsCount: number = 0;
  assetsInUseCount: number = 0;
  assetsInRepairCount: number = 0;
  assetsAvailableCount: number = 0;

  activeProjectsCount: number = 0;
  departmentsCount: number = 0;

  recentPendingApprovals: PendingApprovalItem[] = [];
  employeesOnLeaveToday: any[] = [];

  // 2. MANAGER TEAM METRICS
  myTeamCount: number = 0;
  teamPresentToday: number = 0;
  teamClockedInCount: number = 0;
  teamOnLeaveToday: number = 0;
  teamAbsentToday: number = 0;
  teamPendingApprovalsCount: number = 0;
  directReportsStatus: DirectReportStatus[] = [];
  teamPendingApprovals: PendingApprovalItem[] = [];
  teamProjects: any[] = [];

  // 3. EMPLOYEE PERSONAL WORKSPACE METRICS
  leaveBalances: LeaveBalanceWidget[] = [];
  totalRemainingLeaves: number = 0;

  monthPresentDays: number = 0;
  monthTotalWorkingHours: number = 0;
  monthLatePunchesCount: number = 0;

  currentWeekTimesheetHours: number = 0;
  currentWeekTimesheetTarget: number = 40;
  currentWeekTimesheetStatus: string = 'Draft';
  currentWeekDateRange: string = '';

  myAssignedAssets: any[] = [];
  upcomingHolidays: any[] = [];
  myRecentRequests: any[] = [];

  ngOnInit(): void {
    this.initUserSession();
    this.initRoleAndView();
    this.initClockSubscription();
    this.loadAllDashboardData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // -------------------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------------------
  private initUserSession(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    this.loggedInEmployeeId = Number(localStorage.getItem('employeeId') || 0);

    const storedName =
      localStorage.getItem('fullName') ||
      localStorage.getItem('userName') ||
      localStorage.getItem('UserName') ||
      'Team Member';
    this.userName = storedName;
    const parts = storedName.trim().split(/\s+/);
    this.userFirstName = parts[0] || 'Team Member';

    this.userAvatar = this.employeeService.getProfileAvatar();
    this.userDesignation = localStorage.getItem('Designation') || localStorage.getItem('designation') || 'Employee';
    this.userEmployeeCode = localStorage.getItem('EmployeeCode') || (this.loggedInEmployeeId ? String(this.loggedInEmployeeId) : '');

    // Format current date and dynamic greeting
    const now = new Date();
    const hr = now.getHours();
    if (hr < 12) this.greetingTime = 'Good Morning';
    else if (hr < 17) this.greetingTime = 'Good Afternoon';
    else this.greetingTime = 'Good Evening';

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    this.todayFormatted = now.toLocaleDateString('en-US', options);

    // Compute current week date range
    const monday = this.getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    this.currentWeekDateRange = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  private initRoleAndView(): void {
    if (this.rbacService.isAdmin()) {
      this.primaryRole = 'Admin';
      this.activeView = 'organization';
      this.canSwitchView = true;
      this.viewOptions = [
        { id: 'organization', label: 'Executive Overview', icon: 'business' },
        { id: 'employee', label: 'My Personal Workspace', icon: 'person' }
      ];
    } else if (this.rbacService.isHR()) {
      this.primaryRole = 'HR';
      this.activeView = 'organization';
      this.canSwitchView = true;
      this.viewOptions = [
        { id: 'organization', label: 'HR Operations', icon: 'groups' },
        { id: 'employee', label: 'My Personal Workspace', icon: 'person' }
      ];
    } else if (this.rbacService.isManager()) {
      this.primaryRole = 'Manager';
      this.activeView = 'team';
      this.canSwitchView = true;
      this.viewOptions = [
        { id: 'team', label: 'My Team Leadership', icon: 'supervisor_account' },
        { id: 'employee', label: 'My Personal Workspace', icon: 'person' }
      ];
    } else {
      this.primaryRole = 'Employee';
      this.activeView = 'employee';
      this.canSwitchView = false;
      this.viewOptions = [
        { id: 'employee', label: 'My Workspace', icon: 'person' }
      ];
    }
  }

  private initClockSubscription(): void {
    this.subs.add(
      this.attendanceStateService.isClockedIn$.subscribe(inSession => {
        this.isClockedIn = inSession;
      })
    );

    this.subs.add(
      this.attendanceStateService.hasClockedOutToday$.subscribe(hasOut => {
        this.hasClockedOutToday = hasOut;
      })
    );

    this.subs.add(
      this.attendanceStateService.sessionElapsed$.subscribe(elapsed => {
        this.sessionElapsedDisplay = elapsed;
      })
    );

    this.subs.add(
      this.attendanceStateService.todayTotalHours$.subscribe(hours => {
        if (hours) this.todayTotalHoursDisplay = hours;
      })
    );

    this.subs.add(
      this.attendanceStateService.clockInTime$.subscribe(date => {
        if (date) {
          this.clockInTimeDisplay = this.attendanceStateService.formatTime12(date);
        } else if (!this.hasClockedOutToday) {
          this.clockInTimeDisplay = '--';
        }
      })
    );

    this.subs.add(
      this.attendanceStateService.clockOutTime$.subscribe(date => {
        if (date) {
          this.clockOutTimeDisplay = this.attendanceStateService.formatTime12(date);
        } else if (!this.hasClockedOutToday) {
          this.clockOutTimeDisplay = '--';
        }
      })
    );

    this.subs.add(
      this.attendanceStateService.punchChanged$.subscribe(() => {
        this.loadAllDashboardData();
      })
    );
  }

  switchView(view: 'organization' | 'team' | 'employee'): void {
    this.activeView = view;
  }

  // -------------------------------------------------------------------------------------
  // DATA ORCHESTRATION & FETCHING
  // -------------------------------------------------------------------------------------
  loadAllDashboardData(): void {
    this.isLoading = true;

    const todayStr = this.toYMD(new Date());
    const monday = this.getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monStr = this.toYMD(monday);
    const sunStr = this.toYMD(sunday);

    const isExecutiveOrHR = this.rbacService.isAdmin() || this.rbacService.isHR();
    const isManagerOrAbove = isExecutiveOrHR || this.rbacService.isManager();

    forkJoin({
      employees: this.employeeService.getData().pipe(catchError(() => of([]))),
      attendanceAll: this.attendanceService.getAllData().pipe(catchError(() => of([]))),
      attendanceLogs: of([]),
      leavesAll: this.leaveService.getAllData().pipe(catchError(() => of([]))),
      personalBalances: this.leaveService.getEmployeeLeaveBalance(this.loggedInEmployeeId).pipe(catchError(() => of([]))),
      attenRequests: this.attenRequestService.getAllData().pipe(catchError(() => of([]))),
      timesheetsPending: isManagerOrAbove ? this.timesheetService.getPendingApprovals().pipe(catchError(() => of([]))) : of([]),
      myTimesheet: this.timesheetService.getMyTimesheet(monStr, sunStr).pipe(catchError(() => of(null))),
      candidates: isExecutiveOrHR ? this.candidateService.getData().pipe(catchError(() => of([]))) : of([]),
      assets: this.assetService.getData().pipe(catchError(() => of([]))),
      assetRequests: this.assetRequestService.fetchRequests().pipe(catchError(() => of([]))),
      holidays: this.holidayService.getHoliday().pipe(catchError(() => of([]))),
      projects: isExecutiveOrHR ? this.projectService.getAllData().pipe(catchError(() => of([]))) : of([]),
      documentsAll: this.documentService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res: any) => {
        this.cachedAttendanceAll = Array.isArray(res.attendanceAll) ? res.attendanceAll : (res.attendanceAll?.data || res.attendanceAll?.result || []);
        this.cachedAttendanceLogs = Array.isArray(res.attendanceLogs) ? res.attendanceLogs : (res.attendanceLogs?.data || res.attendanceLogs?.result || []);
        this.cachedLeavesAll = Array.isArray(res.leavesAll) ? res.leavesAll : (res.leavesAll?.data || res.leavesAll?.result || []);
        this.cachedAttenRequests = Array.isArray(res.attenRequests) ? res.attenRequests : (res.attenRequests?.data || res.attenRequests?.result || []);
        this.cachedHolidays = Array.isArray(res.holidays) ? res.holidays : (res.holidays?.data || res.holidays?.result || []);

        this.processEmployees(res.employees);
        this.processAttendance(res.attendanceAll, res.attendanceLogs, res.employees, res.leavesAll);
        this.processLeavesAndBalances(res.leavesAll, res.personalBalances);
        this.processPendingApprovals(res.leavesAll, res.attenRequests, res.timesheetsPending, res.assetRequests, res.documentsAll, res.employees);
        this.processCandidates(res.candidates);
        this.processAssets(res.assets, res.assetRequests);
        this.processHolidays(res.holidays);
        this.processProjects(res.projects);
        this.processMyTimesheet(res.myTimesheet);
        this.processMyRecentRequests(res.leavesAll, res.attenRequests, res.assetRequests, res.documentsAll, res.myTimesheet);

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.isLoading = false;
      }
    });
  }

  // -------------------------------------------------------------------------------------
  // DATA PROCESSORS
  // -------------------------------------------------------------------------------------
  private processEmployees(raw: any): void {
    const list = Array.isArray(raw) ? raw : (raw?.data || raw?.result || []);
    this.totalEmployees = list.length;
    this.activeEmployees = list.filter((e: any) => e.isActive !== false && e.isActive !== 0).length;
    this.inactiveEmployees = this.totalEmployees - this.activeEmployees;

    // Capture logged-in employee date of joining
    if (this.loggedInEmployeeId > 0) {
      const myEmp = list.find((e: any) => Number(e.id || e.employeeId) === Number(this.loggedInEmployeeId));
      if (myEmp?.dateOfJoining) {
        this.currentUserJoiningDate = new Date(myEmp.dateOfJoining);
        this.currentUserJoiningDateStr = String(myEmp.dateOfJoining).substring(0, 10);
      }
    }

    // Count new joinees this month (joined within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.newJoineesThisMonth = list.filter((e: any) => {
      if (!e.dateOfJoining) return false;
      const doj = new Date(e.dateOfJoining);
      return !isNaN(doj.getTime()) && doj >= thirtyDaysAgo;
    }).length;

    // Unique departments
    const deptSet = new Set<string>();
    list.forEach((e: any) => {
      const d = e.department || e.branch || e.designation;
      if (d) deptSet.add(d);
    });
    this.departmentsCount = deptSet.size || 1;

    // Direct reportees for Manager view
    if (this.loggedInEmployeeId > 0) {
      const reports = list.filter((e: any) => Number(e.managerId) === Number(this.loggedInEmployeeId));
      this.myTeamCount = reports.length;
    }
  }

  private processAttendance(rawAtt: any, rawLogs: any, rawEmployees: any, rawLeaves: any): void {
    const attList = Array.isArray(rawAtt) ? rawAtt : (rawAtt?.data || rawAtt?.result || []);
    const logList = Array.isArray(rawLogs) ? rawLogs : (rawLogs?.data || rawLogs?.result || []);
    const empList = Array.isArray(rawEmployees) ? rawEmployees : (rawEmployees?.data || rawEmployees?.result || []);
    const leaveList = Array.isArray(rawLeaves) ? rawLeaves : (rawLeaves?.data || rawLeaves?.result || []);

    const todayStr = this.toYMD(new Date());
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Map helper for employee ID
    const getEmpId = (item: any) => Number(item.employeeId ?? item.EmployeeId ?? item.id ?? item.Id ?? 0);

    // Filter today's attendance records
    const todayAtt = attList.filter((a: any) => {
      const d = a.attendanceDate || a.AttendanceDate;
      return d && this.toYMD(d) === todayStr;
    });

    const isTodayWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isTodayHoliday = this.cachedHolidays.some((h: any) => {
      const hd = h.holidayDate || h.HolidayDate;
      return hd && this.toYMD(hd) === todayStr;
    });

    // Identify who is on approved leave today (excluding weekends and company holidays)
    const leavesToday = (isTodayWeekend || isTodayHoliday) ? [] : leaveList.filter((l: any) => {
      if (l.status !== 'Approved') return false;
      const s = this.toYMD(l.startDate);
      const e = this.toYMD(l.endDate);
      return s <= todayStr && todayStr <= e;
    });

    this.onLeaveTodayCount = leavesToday.length;
    this.employeesOnLeaveToday = leavesToday.map((l: any) => {
      const emp = empList.find((e: any) => getEmpId(e) === getEmpId(l));
      return {
        employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : `Employee #${getEmpId(l)}`,
        leaveType: l.leaveTypeName || l.type || 'Leave',
        durationText: l.leaveMode || 'Full Day',
        endDate: l.endDate
      };
    });

    // Calculate present, clocked in, and late for today
    const presentEmpIds = new Set<number>();
    let clockedInCount = 0;
    let lateCount = 0;

    todayAtt.forEach((a: any) => {
      const empId = getEmpId(a);
      const clockIn = a.clockIn || a.ClockIn;
      const clockOut = a.clockOut || a.ClockOut;

      if (this.isValidTime(clockIn)) {
        presentEmpIds.add(empId);

        // Active session check
        if (!this.isValidTime(clockOut)) {
          clockedInCount++;
        }

        // Late check (after 09:45 AM)
        const inDate = this.attendanceStateService.parseDateSafe(clockIn);
        if (inDate && !isNaN(inDate.getTime())) {
          if (inDate.getHours() > 9 || (inDate.getHours() === 9 && inDate.getMinutes() > 45)) {
            lateCount++;
          }
        }
      }
    });

    this.presentTodayCount = presentEmpIds.size;
    this.clockedInNowCount = clockedInCount;
    this.lateTodayCount = lateCount;

    // Calculate absent: Total active - Present - Approved Leave
    const estimatedAbsent = Math.max(0, this.activeEmployees - this.presentTodayCount - this.onLeaveTodayCount);
    this.absentTodayCount = estimatedAbsent;

    // Attendance percentage
    if (this.activeEmployees > 0) {
      this.attendanceRatePercent = Math.min(100, Math.round((this.presentTodayCount / this.activeEmployees) * 100));
    } else {
      this.attendanceRatePercent = 0;
    }

    // Process MANAGER Team Attendance
    if (this.loggedInEmployeeId > 0) {
      const teamEmployees = empList.filter((e: any) => Number(e.managerId) === Number(this.loggedInEmployeeId));
      let teamPresent = 0;
      let teamClockedIn = 0;
      let teamLeave = 0;

      this.directReportsStatus = teamEmployees.map((e: any) => {
        const empId = getEmpId(e);
        const name = `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Colleague';
        const initials = this.getInitials(name);
        const designation = e.designation || 'Staff';

        // Check if on leave today
        const onLeave = leavesToday.find((l: any) => getEmpId(l) === empId);
        if (onLeave) {
          teamLeave++;
          return {
            id: empId,
            name,
            initials,
            designation,
            status: 'On Leave',
            leaveType: onLeave.leaveTypeName || onLeave.type || 'Leave'
          };
        }

        // Check today's punch
        const att = todayAtt.find((a: any) => getEmpId(a) === empId);
        if (att && this.isValidTime(att.clockIn || att.ClockIn)) {
          teamPresent++;
          const inTime = this.attendanceStateService.parseDateSafe(att.clockIn || att.ClockIn);
          const hasOut = this.isValidTime(att.clockOut || att.ClockOut);
          const isLate = inTime ? inDateIsLate(inTime) : false;

          if (!hasOut) teamClockedIn++;

          return {
            id: empId,
            name,
            initials,
            designation,
            status: isLate ? 'Late' : (hasOut ? 'Present' : 'Clocked In'),
            clockInTime: inTime ? this.attendanceStateService.formatTime12(inTime) : '--',
            hoursWorked: (att.totalHours || att.TotalHours || att.effectiveHours || 0) > 0 ? `${Number(att.totalHours || att.effectiveHours).toFixed(1)}h` : undefined
          };
        }

        // Otherwise absent / not punched
        return {
          id: empId,
          name,
          initials,
          designation,
          status: 'Absent'
        };
      });

      this.teamPresentToday = teamPresent;
      this.teamClockedInCount = teamClockedIn;
      this.teamOnLeaveToday = teamLeave;
      this.teamAbsentToday = Math.max(0, this.myTeamCount - teamPresent - teamLeave);
    }

    // Process PERSONAL Monthly Attendance for Logged-In User
    if (this.loggedInEmployeeId > 0) {
      const myMonthlyAtt = attList.filter((a: any) => {
        if (getEmpId(a) !== this.loggedInEmployeeId) return false;
        const d = a.attendanceDate || a.AttendanceDate;
        if (!d) return false;
        const dt = new Date(d);
        return !isNaN(dt.getTime()) && dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
      });

      let presentDays = 0;
      let totalHrs = 0;
      let lateDays = 0;

      myMonthlyAtt.forEach((a: any) => {
        const inT = a.clockIn || a.ClockIn;
        if (this.isValidTime(inT)) {
          presentDays++;
          const hrs = Number(a.totalHours || a.TotalHours || a.effectiveHours || a.EffectiveHours || 0);
          totalHrs += hrs;

          const inDate = this.attendanceStateService.parseDateSafe(inT);
          if (inDate && inDateIsLate(inDate)) {
            lateDays++;
          }
        }
      });

      this.monthPresentDays = presentDays;
      this.monthTotalWorkingHours = Math.round(totalHrs * 10) / 10;
      this.monthLatePunchesCount = lateDays;

      // Personal clock display (clockInTimeDisplay, isClockedIn, hasClockedOutToday)
      // is managed exclusively by initClockSubscription() via AttendanceStateService.
      // Do NOT set them here to avoid race-condition overwrites with stale forkJoin data.
    }

    function inDateIsLate(d: Date): boolean {
      return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 45);
    }
  }

  private processLeavesAndBalances(rawAllLeaves: any, rawBalances: any): void {
    const list = Array.isArray(rawBalances) ? rawBalances : (rawBalances?.data || rawBalances?.result || []);

    const colorPalettes = [
      { type: 'Casual', colorClass: 'badge-emerald' },
      { type: 'Sick', colorClass: 'badge-amber' },
      { type: 'Paid', colorClass: 'badge-blue' },
      { type: 'Privilege', colorClass: 'badge-blue' }
    ];

    if (Array.isArray(list) && list.length > 0) {
      let totalRem = 0;
      this.leaveBalances = list.map((b: any, index: number) => {
        const allowed = Number(b.allowedDays || b.allowed || 12);
        const used = Number(b.usedDays || b.used || 0);
        const remaining = Math.max(0, Number(b.remainingDays ?? (allowed - used)));
        totalRem += remaining;

        const pct = allowed > 0 ? Math.min(100, Math.round((remaining / allowed) * 100)) : 0;
        const typeName = b.leaveTypeName || b.leaveName || b.type || `Leave Type ${index + 1}`;
        const match = colorPalettes.find(c => typeName.toLowerCase().includes(c.type.toLowerCase()));
        const colorClass = match ? match.colorClass : (index % 2 === 0 ? 'badge-blue' : 'badge-purple');

        return {
          type: typeName,
          allowed,
          used,
          remaining,
          percentage: pct,
          colorClass
        };
      });
      this.totalRemainingLeaves = totalRem;
    } else {
      // Clean fallback: Empty state when no leave quotas are allocated in database
      this.leaveBalances = [];
      this.totalRemainingLeaves = 0;
    }
  }

  private processPendingApprovals(rawLeaves: any, rawAttReqs: any, rawTimesheets: any, rawAssets: any, rawDocs: any, rawEmployees: any): void {
    const leaves = Array.isArray(rawLeaves) ? rawLeaves : (rawLeaves?.data || []);
    const attReqs = Array.isArray(rawAttReqs) ? rawAttReqs : (rawAttReqs?.data || []);
    const timesheets = Array.isArray(rawTimesheets) ? rawTimesheets : (rawTimesheets?.data || []);
    const assetTickets = Array.isArray(rawAssets) ? rawAssets : (rawAssets?.data || []);
    const docs = Array.isArray(rawDocs) ? rawDocs : (rawDocs?.data || rawDocs?.result || []);
    const empList = Array.isArray(rawEmployees) ? rawEmployees : (rawEmployees?.data || []);

    const getEmpName = (id: number) => {
      const e = empList.find((emp: any) => Number(emp.id ?? emp.employeeId) === Number(id));
      return e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() : `Employee #${id}`;
    };

    const pendingLeaves = leaves.filter((l: any) => l.status === 'Pending');
    const pendingAtt = attReqs.filter((a: any) => a.status === 'Pending');
    const pendingTs = timesheets.filter((t: any) => t.status === 'Submitted' || t.status === 'Pending');
    const pendingAssets = assetTickets.filter((t: any) => t.status === 'Submitted' || t.status === 'Pending Inspection');
    const pendingDocs = docs.filter((d: any) => String(d.status || d.Status || '').trim().toLowerCase() === 'pending');

    this.pendingLeavesCount = pendingLeaves.length;
    this.pendingAttendanceCount = pendingAtt.length;
    this.pendingTimesheetsCount = pendingTs.length;
    this.pendingAssetTicketsCount = pendingAssets.length;
    this.pendingDocumentsCount = pendingDocs.length;

    this.totalPendingApprovals =
      this.pendingLeavesCount +
      this.pendingAttendanceCount +
      this.pendingTimesheetsCount +
      this.pendingAssetTicketsCount +
      this.pendingDocumentsCount;

    // Build consolidated list of top recent pending requests for Admin/HR
    const consolidated: PendingApprovalItem[] = [];

    pendingLeaves.slice(0, 5).forEach((l: any) => {
      const name = getEmpName(l.employeeId);
      const workingDays = (l.totalDays !== undefined && l.totalDays !== null && Number(l.totalDays) > 0)
        ? Number(l.totalDays)
        : this.leaveService.calculateWorkingLeaveDays(l.startDate, l.endDate, l.leaveMode, this.cachedHolidays);
      const daysText = `${workingDays} ${workingDays === 1 ? 'Day' : 'Days'}`;
      consolidated.push({
        id: l.id || l.leaveRequestId,
        requesterName: name,
        initials: this.getInitials(name),
        category: 'Leave',
        title: `${l.leaveTypeName || 'Leave'} (${daysText})`,
        dateStr: `${this.formatDisplayDate(l.startDate)} - ${this.formatDisplayDate(l.endDate)}`,
        reason: l.leaveReason || 'Leave Request',
        rawItem: l
      });
    });

    pendingAtt.slice(0, 5).forEach((a: any) => {
      const name = getEmpName(a.employeeId);
      consolidated.push({
        id: a.id,
        requesterName: name,
        initials: this.getInitials(name),
        category: 'Attendance',
        title: `Regularization: ${this.formatDisplayDate(a.requestedDate || a.attendanceDate)}`,
        dateStr: `${a.clockInTime ? this.attendanceStateService.formatTime12(this.attendanceStateService.parseDateSafe(a.clockInTime)) : '09:30 AM'} - ${a.clockOutTime ? this.attendanceStateService.formatTime12(this.attendanceStateService.parseDateSafe(a.clockOutTime)) : '06:30 PM'}`,
        reason: a.reason || 'Missed Punch Regularization',
        rawItem: a
      });
    });

    pendingTs.slice(0, 5).forEach((t: any) => {
      const name = t.employeeName || getEmpName(t.employeeId);
      consolidated.push({
        id: t.timesheetId || t.id,
        requesterName: name,
        initials: this.getInitials(name),
        category: 'Timesheet',
        title: `${t.periodType || 'Weekly'} Timesheet (${t.totalTimesheetHours || t.totalHours || 0} hrs)`,
        dateStr: `${this.formatDisplayDate(t.startDate)} - ${this.formatDisplayDate(t.endDate)}`,
        reason: `Total logged hours: ${t.totalTimesheetHours || 0}h`,
        rawItem: t
      });
    });

    pendingDocs.slice(0, 5).forEach((d: any) => {
      const empId = Number(d.employeeId ?? d.EmployeeId ?? d.uploadedBy ?? d.UploadedBy ?? 0);
      const name = getEmpName(empId);
      const docTitle = d.documentName || d.DocumentName || d.category || 'Employee Document';
      const dateVal = d.createdDate || d.CreatedDate || d.uploadedDate || d.UploadedDate;
      consolidated.push({
        id: Number(d.id ?? d.Id ?? d.documentId ?? d.DocumentId ?? 0),
        requesterName: name,
        initials: this.getInitials(name),
        category: 'Document',
        title: `Doc Verification: ${docTitle}`,
        dateStr: this.formatDisplayDate(dateVal),
        reason: d.category ? `Category: ${d.category}` : 'Document Verification Request',
        rawItem: d
      });
    });

    this.recentPendingApprovals = consolidated.slice(0, 6);

    // Process MANAGER'S specific team pending approvals
    if (this.loggedInEmployeeId > 0) {
      const teamEmployees = empList.filter((e: any) => Number(e.managerId) === Number(this.loggedInEmployeeId));
      const teamEmpIds = new Set<number>(teamEmployees.map((e: any) => Number(e.id ?? e.employeeId)));

      const teamPendingList: PendingApprovalItem[] = [];

      pendingLeaves.filter((l: any) => teamEmpIds.has(Number(l.employeeId))).forEach((l: any) => {
        const name = getEmpName(l.employeeId);
        teamPendingList.push({
          id: l.id,
          requesterName: name,
          initials: this.getInitials(name),
          category: 'Leave',
          title: `${l.leaveTypeName || 'Leave'} Application`,
          dateStr: `${this.formatDisplayDate(l.startDate)} - ${this.formatDisplayDate(l.endDate)}`,
          reason: l.leaveReason,
          rawItem: l
        });
      });

      pendingAtt.filter((a: any) => teamEmpIds.has(Number(a.employeeId))).forEach((a: any) => {
        const name = getEmpName(a.employeeId);
        teamPendingList.push({
          id: a.id,
          requesterName: name,
          initials: this.getInitials(name),
          category: 'Attendance',
          title: `Attendance Adjustment`,
          dateStr: this.formatDisplayDate(a.requestedDate),
          reason: a.reason,
          rawItem: a
        });
      });

      pendingTs.filter((t: any) => teamEmpIds.has(Number(t.employeeId))).forEach((t: any) => {
        const name = t.employeeName || getEmpName(t.employeeId);
        teamPendingList.push({
          id: t.timesheetId || t.id,
          requesterName: name,
          initials: this.getInitials(name),
          category: 'Timesheet',
          title: `Timesheet Review (${t.totalTimesheetHours || 0} hrs)`,
          dateStr: `${this.formatDisplayDate(t.startDate)} - ${this.formatDisplayDate(t.endDate)}`,
          reason: `Total logged hours: ${t.totalTimesheetHours || 0}h`,
          rawItem: t
        });
      });

      pendingDocs.filter((d: any) => {
        const empId = Number(d.employeeId ?? d.EmployeeId ?? d.uploadedBy ?? d.UploadedBy ?? 0);
        return teamEmpIds.has(empId);
      }).forEach((d: any) => {
        const empId = Number(d.employeeId ?? d.EmployeeId ?? d.uploadedBy ?? d.UploadedBy ?? 0);
        const name = getEmpName(empId);
        const docTitle = d.documentName || d.DocumentName || d.category || 'Employee Document';
        const dateVal = d.createdDate || d.CreatedDate || d.uploadedDate || d.UploadedDate;
        teamPendingList.push({
          id: Number(d.id ?? d.Id ?? d.documentId ?? d.DocumentId ?? 0),
          requesterName: name,
          initials: this.getInitials(name),
          category: 'Document',
          title: `Doc Verification: ${docTitle}`,
          dateStr: this.formatDisplayDate(dateVal),
          reason: d.category ? `Category: ${d.category}` : 'Document Verification Request',
          rawItem: d
        });
      });

      this.teamPendingApprovals = teamPendingList;
      this.teamPendingApprovalsCount = teamPendingList.length;
    }
  }

  private processCandidates(raw: any): void {
    const list = Array.isArray(raw) ? raw : (raw?.data || raw?.result || []);
    this.totalCandidatesCount = list.length;
    this.candidatesInterviewCount = list.filter((c: any) => c.stage === 'Interview' || c.stage === 'Technical Interview').length;
    this.candidatesOfferCount = list.filter((c: any) => c.stage === 'Offer' || c.stage === 'Offer Extended').length;
  }

  private processAssets(rawAssets: any, rawRequests: any): void {
    const list = Array.isArray(rawAssets) ? rawAssets : (rawAssets?.data || rawAssets?.result || []);
    this.totalAssetsCount = list.length;
    this.assetsInUseCount = list.filter((a: any) => a.status === 'Assigned' || (a.employeeId && a.employeeId > 0)).length;
    this.assetsInRepairCount = list.filter((a: any) => a.status === 'In Repair').length;
    this.assetsAvailableCount = list.filter((a: any) => a.status === 'Available' || !a.employeeId).length;

    // Filter personal assets assigned to logged in user
    if (this.loggedInEmployeeId > 0) {
      this.myAssignedAssets = list.filter((a: any) => Number(a.employeeId) === Number(this.loggedInEmployeeId));
    }
  }

  private processHolidays(raw: any): void {
    const list = Array.isArray(raw) ? raw : (raw?.data || raw?.result || []);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = list
      .map((h: any) => {
        const rawDate = h.holidayDate || h.date;
        const d = new Date(rawDate);
        return {
          id: h.id,
          name: h.holidayName || h.name || 'Company Holiday',
          date: d,
          dateStr: !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '',
          isOptional: !!h.isOptional,
          type: h.type || (h.isOptional ? 'Optional' : 'Public')
        };
      })
      .filter((h: any) => !isNaN(h.date.getTime()) && h.date >= now)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);

    this.upcomingHolidays = upcoming.map((h: any) => {
      const diffTime = h.date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let countdown = '';
      if (diffDays === 0) countdown = 'Today';
      else if (diffDays === 1) countdown = 'Tomorrow';
      else countdown = `In ${diffDays} days`;

      return {
        ...h,
        countdown
      };
    });
  }

  private processProjects(raw: any): void {
    const list = Array.isArray(raw) ? raw : (raw?.data || raw?.result || []);
    this.activeProjectsCount = list.filter((p: any) => p.status !== 'Completed' && p.status !== 'Archived').length;

    if (this.loggedInEmployeeId > 0) {
      this.teamProjects = list.filter((p: any) => Number(p.projectManagerId) === Number(this.loggedInEmployeeId));
    }
  }

  private processMyTimesheet(myTs: any): void {
    if (myTs) {
      this.currentWeekTimesheetHours = Number(myTs.totalTimesheetHours || 0);
      this.currentWeekTimesheetStatus = myTs.status || 'Draft';
    } else {
      this.currentWeekTimesheetHours = 0;
      this.currentWeekTimesheetStatus = 'Draft';
    }
  }

  private processMyRecentRequests(rawLeaves: any, rawAttReqs: any, rawAssetTickets: any, rawDocs: any, myTs: any): void {
    if (this.loggedInEmployeeId <= 0) return;

    const leaves = Array.isArray(rawLeaves) ? rawLeaves : (rawLeaves?.data || []);
    const attReqs = Array.isArray(rawAttReqs) ? rawAttReqs : (rawAttReqs?.data || []);
    const assetTickets = Array.isArray(rawAssetTickets) ? rawAssetTickets : (rawAssetTickets?.data || []);
    const docs = Array.isArray(rawDocs) ? rawDocs : (rawDocs?.data || rawDocs?.result || []);

    // getAllData() returns all employees' leaves with employeeId — filter to current user only.
    // Fallback: if no leaves match by id (personal endpoint that doesn't return employeeId), show all (already scoped by backend).
    const allMyLeavesCandidates = leaves.filter((l: any) => Number(l.employeeId || l.EmployeeId || 0) === Number(this.loggedInEmployeeId));
    const myLeaves = (allMyLeavesCandidates.length > 0 ? allMyLeavesCandidates : leaves)
      .slice(0, 3)
      .map((l: any) => {
        const workingDays = (l.totalDays !== undefined && l.totalDays !== null && Number(l.totalDays) > 0)
          ? Number(l.totalDays)
          : this.leaveService.calculateWorkingLeaveDays(l.startDate, l.endDate, l.leaveMode, this.cachedHolidays);
        const daysText = `${workingDays} ${workingDays === 1 ? 'Day' : 'Days'}`;
        return {
          type: 'Leave',
          title: `${l.leaveTypeName || 'Leave'} (${daysText})`,
          date: `${this.formatDisplayDate(l.startDate)} - ${this.formatDisplayDate(l.endDate)}`,
          status: l.status || 'Pending',
          statusClass: this.getStatusClass(l.status)
        };
      });

    const myAtt = attReqs
      .filter((a: any) => Number(a.employeeId) === Number(this.loggedInEmployeeId))
      .slice(0, 3)
      .map((a: any) => ({
        type: 'Attendance',
        title: `Regularization Request`,
        date: this.formatDisplayDate(a.requestedDate || a.attendanceDate),
        status: a.status || 'Pending',
        statusClass: this.getStatusClass(a.status)
      }));

    const myTickets = assetTickets
      .filter((t: any) => Number(t.employeeId) === Number(this.loggedInEmployeeId))
      .slice(0, 2)
      .map((t: any) => ({
        type: 'Asset Ticket',
        title: `${t.requestType || 'Repair'} - ${t.assetName || 'Equipment'}`,
        date: this.formatDisplayDate(t.createdDate),
        status: t.status || 'Pending',
        statusClass: this.getStatusClass(t.status)
      }));

    const myDocs = docs
      .filter((d: any) => {
        const empId = Number(d.employeeId ?? d.EmployeeId ?? d.uploadedBy ?? d.UploadedBy ?? 0);
        return empId === this.loggedInEmployeeId;
      })
      .slice(0, 3)
      .map((d: any) => ({
        type: 'Document',
        title: d.documentName || d.DocumentName || d.category || 'Document Upload',
        date: this.formatDisplayDate(d.createdDate || d.CreatedDate || d.uploadedDate || d.UploadedDate),
        status: d.status || d.Status || 'Pending',
        statusClass: this.getStatusClass(d.status || d.Status)
      }));

    this.myRecentRequests = [...myLeaves, ...myAtt, ...myTickets, ...myDocs].slice(0, 6);
  }

  // -------------------------------------------------------------------------------------
  // QUICK ACTIONS & MODAL LAUNCHERS
  // -------------------------------------------------------------------------------------
  onPunchClick(): void {
    if (this.isClockedIn) {
      const dialogRef = this.dialog.open(EmployeeAttendComponent, {
        width: '430px',
        data: {
          title: 'Confirm Clock-Out',
          message: 'Are you sure you want to end your working session and record your departure punch for today?',
          punchType: 'clockOut',
          confirmText: 'Clock-Out',
          confirmColor: 'warn'
        }
      });
      dialogRef.afterClosed().subscribe(res => {
        if (res === 'confirm') {
          this.attendanceStateService.clockOut();
        }
      });
    } else {
      const dialogRef = this.dialog.open(EmployeeAttendComponent, {
        width: '430px',
        data: {
          title: this.hasClockedOutToday ? 'Confirm Clock-In (New Session)' : 'Confirm Clock-In',
          message: this.hasClockedOutToday
            ? 'You have already clocked out for today. Would you like to record an additional working session?'
            : 'Ready to start your working session? This will record your arrival timestamp for today.',
          punchType: 'clockIn',
          confirmText: this.hasClockedOutToday ? 'Clock-In Again' : 'Clock-In',
          confirmColor: 'primary'
        }
      });
      dialogRef.afterClosed().subscribe(res => {
        if (res === 'confirm') {
          this.attendanceStateService.clockIn();
        }
      });
    }
  }

  openApplyLeaveModal(): void {
    const dialogRef = this.dialog.open(LeaverequestComponent, {
      width: '860px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllDashboardData();
      }
    });
  }

  openRegularizeModal(): void {
    const target = this.findMostRecentRegularizationDate();
    const dialogRef = this.dialog.open(AttendaseditComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        employeeId: this.loggedInEmployeeId,
        date: target.date,
        dateObj: target.date,
        dateStr: target.dateStr,
        hasExistingClockIn: target.hasExistingIn,
        existingClockInDisplay: target.hasExistingIn ? target.clockIn : null,
        lockDate: false,
        clockIn: target.clockIn,
        clockOut: target.clockOut,
        joiningDate: this.currentUserJoiningDate,
        joiningDateStr: this.currentUserJoiningDateStr,
        attendanceRecords: this.cachedAttendanceAll,
        existingRequests: this.cachedAttenRequests,
        leaves: this.cachedLeavesAll,
        holidays: this.cachedHolidays
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllDashboardData();
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  private findMostRecentRegularizationDate(): { date: Date; dateStr: string; hasExistingIn: boolean; clockIn: string; clockOut: string } {
    const attList = this.cachedAttendanceAll || [];
    const reqList = this.cachedAttenRequests || [];
    const holidayList = this.cachedHolidays || [];
    const leaveList = this.cachedLeavesAll || [];

    const holidaySet = new Set<string>();
    holidayList.forEach((h: any) => {
      const hd = this.toYMD(h.holidayDate || h.date);
      if (hd) holidaySet.add(hd);
    });

    const leaveSet = new Set<string>();
    leaveList.forEach((l: any) => {
      if (Number(l.employeeId) === this.loggedInEmployeeId && (l.status === 'Approved' || l.status === 'Pending')) {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate || l.startDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const cur = new Date(start);
          while (cur <= end) {
            leaveSet.add(this.toYMD(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    });

    const reqSet = new Set<string>();
    reqList.forEach((r: any) => {
      if (Number(r.employeeId || r.EmployeeId) === this.loggedInEmployeeId) {
        const st = String(r.status || r.Status || '').toLowerCase();
        if (st === 'pending' || st === 'approved') {
          const rd = this.toYMD(r.requestedDate || r.RequestedDate || r.attendanceDate || r.AttendanceDate);
          if (rd) reqSet.add(rd);
        }
      }
    });

    // Map of user attendance records by YYYY-MM-DD
    const userAttMap = new Map<string, any>();
    attList.forEach((a: any) => {
      const aEmpId = Number(a.employeeId || a.EmployeeId || a.id);
      if (aEmpId === this.loggedInEmployeeId) {
        const dStr = this.toYMD(a.attendanceDate || a.AttendanceDate || a.date || a.Date);
        if (dStr) {
          userAttMap.set(dStr, a);
        }
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Scan backwards from yesterday for up to 30 days
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const checkYMD = this.toYMD(checkDate);
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Skip holidays & approved leaves
      if (holidaySet.has(checkYMD) || leaveSet.has(checkYMD)) continue;

      // Skip prior to joining
      if (this.currentUserJoiningDate && checkDate < this.currentUserJoiningDate) continue;

      // Skip dates already pending or approved for regularization
      if (reqSet.has(checkYMD)) continue;

      const record = userAttMap.get(checkYMD);
      if (!record) {
        // Past working day with NO attendance record -> Absent!
        return {
          date: checkDate,
          dateStr: checkYMD,
          hasExistingIn: false,
          clockIn: '09:30',
          clockOut: '18:30'
        };
      }

      const hasIn = this.isValidTime(record.clockIn || record.ClockIn);
      const hasOut = this.isValidTime(record.clockOut || record.ClockOut);
      const status = String(record.attendance || record.Attendance || '').toLowerCase();

      if (status === 'absent' || (!hasIn && !hasOut)) {
        // Marked as Absent
        return {
          date: checkDate,
          dateStr: checkYMD,
          hasExistingIn: false,
          clockIn: '09:30',
          clockOut: '18:30'
        };
      }

      if (hasIn && !hasOut) {
        // Missing Punch: clocked in but forgot to clock out!
        const inDate = new Date(record.clockIn || record.ClockIn);
        const inH = inDate.getHours().toString().padStart(2, '0');
        const inM = inDate.getMinutes().toString().padStart(2, '0');
        return {
          date: checkDate,
          dateStr: checkYMD,
          hasExistingIn: true,
          clockIn: `${inH}:${inM}`,
          clockOut: '18:30'
        };
      }
    }

    // Fallback: yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return {
      date: yesterday,
      dateStr: this.toYMD(yesterday),
      hasExistingIn: false,
      clockIn: '09:30',
      clockOut: '18:30'
    };
  }

  // -------------------------------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------------------------------
  private toYMD(val: any): string {
    if (!val) return '';
    if (typeof val === 'string' && val.length >= 10 && val.includes('-')) {
      return val.substring(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  private isValidTime(val: any): boolean {
    if (!val) return false;
    if (val === '0001-01-01T00:00:00' || val === '1970-01-01T00:00:00') return false;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getFullYear() > 2000;
  }

  private formatDisplayDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).substring(0, 10);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'EM';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'submitted':
      case 'pending':
      case 'in review':
        return 'status-pending';
      default:
        return 'status-neutral';
    }
  }
}
