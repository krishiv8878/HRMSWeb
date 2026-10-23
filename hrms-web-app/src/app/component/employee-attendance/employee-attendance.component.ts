import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, catchError } from 'rxjs';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';
import { EmailService } from '../../services/leaveRequest/email.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { EmployeeAttendComponent } from '../../modal/employee-attend/employee-attend.component';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';
import { ShiftSwapModalComponent } from '../../modal/shift-swap-modal/shift-swap-modal.component';
import { WorkModelPolicyService, WorkModelType } from '../../services/work-model/work-model-policy.service';
import { CancelLeaveModalComponent } from '../../modal/cancel-leave-modal/cancel-leave-modal.component';
import { EmployeeService } from '../../services/employee/employee.service';
import { GlobalFilterService } from '../../services/filter/global-filter.service';
import { AttendanceStateService } from '../../services/attendance/attendance-state.service';
import { RbacService } from '../../core/rbac.service';
import { Subscription } from 'rxjs';

export interface BreakInterval {
  breakNumber: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationDisplay: string;
}

export interface PunchSession {
  sessionNumber: number;
  inTime: string;
  outTime: string;
  durationHours: number;
  durationDisplay: string;
}

export interface AttendanceRow {
  dateObj: Date;
  dateStr: string;
  dayName: string;
  formattedDate: string;
  isWeekend: boolean;
  isHoliday?: boolean;
  isLeave?: boolean;
  isPriorToJoining?: boolean;
  leaveRecord?: any;
  leaveTypeName?: string;
  status: string;
  clockIn?: string;
  clockOut?: string;
  clockInDisplay?: string;
  clockOutDisplay?: string;
  totalHoursDecimal?: number;
  effectiveHoursDecimal?: number;
  breakHoursDecimal?: number;
  totalHoursDisplay?: string;
  effectiveHoursDisplay?: string;
  breakTimeDisplay?: string;
  breaks?: BreakInterval[];
  punchSessions?: PunchSession[];
  overtimeDisplay?: string;
  isOvertime?: boolean;
  rawItem?: any;

  // Regularization details
  isRegularized: boolean;
  regularizationStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
  rejectionReason?: string;
  canRegularize: boolean;
  punchType: 'Self Punch' | 'Regularized' | 'None';
  workMode?: WorkModelType;
}

export interface CalendarDay extends AttendanceRow {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  holidayName?: string;
  leaveType?: string;
}

export interface RegisterDayCell {
  dayNumber: number;
  dateStr: string;
  dayName: string;
  code: 'P' | 'A' | 'HD' | 'WFH' | 'OD' | 'WO' | 'H' | 'L' | 'LOP' | '-';
  label: string;
  badgeClass: string;
  details?: string;
}

export interface RegisterEmployeeRow {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  days: RegisterDayCell[];
  presentCount: number;
  wfhCount: number;
  onDutyCount: number;
  halfDayCount: number;
  leaveCount: number;
  holidayCount: number;
  weeklyOffCount: number;
  absentCount: number;
  payableDays: number;
}

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent implements OnInit, OnDestroy {
  private services = inject(EmployeeeService);
  private attRequestService = inject(AttendanceRequestService);
  private emailService = inject(EmailService);
  private holidayService = inject(HolidayservicesService);
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  private globalFilterService = inject(GlobalFilterService);
  private attendanceStateService = inject(AttendanceStateService);
  public workModelService = inject(WorkModelPolicyService);
  private rbacService = inject(RbacService);
  public isHrOrAdmin: boolean = false;
  todayWorkMode: WorkModelType = 'WFO';
  weeklyHybridProgress: any = null;
  private route = inject(ActivatedRoute);
  private filterSub?: Subscription;
  private routeSub?: Subscription;
  private punchSub?: Subscription;
  private clockedInSub?: Subscription;
  private sessionElapsedSub?: Subscription;
  private clockInTimeSub?: Subscription;
  private isTodayRegularizedSub?: Subscription;
  private regularizedStatusLabelSub?: Subscription;

  Math = Math;

  // Employee Date of Joining (DOJ) Restriction
  joiningDate: Date | null = null;
  joiningDateStr: string = '';

  // View state: 'calendar', 'table', or 'register'
  viewMode: 'calendar' | 'table' | 'register' = 'calendar';

  // Register Matrix State
  registerDate: Date = new Date();
  registerDaysHeaders: { dayNumber: number; dayName: string; isWeekend: boolean }[] = [];
  registerRows: RegisterEmployeeRow[] = [];
  filteredRegisterRows: RegisterEmployeeRow[] = [];
  registerDepartment: string = 'All';
  registerSearch: string = '';
  allWorkforceEmployees: any[] = [];
  registerDepartmentsList: string[] = [];

  // Calendar State
  calendarDate: Date = new Date();
  calendarWeeks: CalendarDay[][] = [];
  selectedDay: CalendarDay | null = null;
  weekDayNames: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar Month Summary Metrics
  calendarMonthPresent: number = 0;
  calendarMonthAbsent: number = 0;
  calendarMonthLeaves: number = 0;
  calendarMonthHolidays: number = 0;
  calendarMonthWeekOffs: number = 0;
  calendarMonthWorkingDays: number = 0;
  calendarMonthAvgHours: string = '00h 00m';
  calendarMonthOvertime: string = '00h 00m';
  calendarMonthCompliance: number = 100;

  // Next-Day Incomplete Punch Prompt State
  missingPunchDay: AttendanceRow | null = null;
  isMissingPunchDismissed: boolean = false;

  // Month / Year Options for picker
  monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];
  yearOptions: number[] = [2024, 2025, 2026, 2027];

  // Cached raw data
  cachedRecords: any[] = [];
  cachedRequests: any[] = [];
  cachedLeaves: any[] = [];
  cachedHolidays: any[] = [];
  cachedLogs: any[] = [];

  // Component state
  employeeId: string = '1';
  isClockedIn: boolean = false;
  isTodayRegularized: boolean = false;
  regularizedStatusLabel: string = '';
  clockInTime: Date | null = null;
  activeSessionDuration: string = '00h 00m 00s';

  // Real-time Clock
  currentTimeDisplay: string = '';
  currentDateDisplay: string = '';
  private timerInterval: any;
  private sessionInterval: any;

  // Attendance Records (Table View)
  allRows: AttendanceRow[] = [];
  filteredRows: AttendanceRow[] = [];
  paginatedRows: AttendanceRow[] = [];

  // Filter state
  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedMonth: string = 'Current';

  // Table Metrics
  avgWorkingHours: string = '08:15';
  avgInTime: string = '09:48 AM';
  avgOutTime: string = '07:15 PM';
  presentDaysCount: number = 22;
  totalWorkingDays: number = 24;
  complianceRate: number = 92;

  // Role & Session Separation: Authenticated User vs Inspected Employee
  loggedInEmployeeId: string = '';
  selectedEmployeeId: string = 'All';
  selectedEmployeeName: string = '';

  get isViewingOtherEmployee(): boolean {
    if (!this.selectedEmployeeId || this.selectedEmployeeId === 'All') return false;
    return String(this.selectedEmployeeId) !== String(this.loggedInEmployeeId);
  }

  get effectiveTargetEmployeeId(): number {
    if (this.isViewingOtherEmployee && this.selectedEmployeeId && this.selectedEmployeeId !== 'All') {
      return Number(this.selectedEmployeeId);
    }
    return Number(this.loggedInEmployeeId || this.employeeId || 1);
  }

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];
  sortOrder: 'desc' | 'asc' = 'desc';

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.globalFilterService.setSortOrder(this.sortOrder);
    this.filterAttendance();
  }

  ngOnInit() {
    const roles = this.rbacService.getUserRoles();
    const isStrictEmployee = roles.length === 1 && roles[0].toLowerCase() === 'employee';
    if (isStrictEmployee) {
      this.isHrOrAdmin = false;
      if (this.viewMode === 'register') {
        this.viewMode = 'calendar';
      }
    } else {
      this.isHrOrAdmin = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
    }
    if (typeof window !== 'undefined') {
      this.initClock();
      if (typeof localStorage !== 'undefined') {
        const storedId = localStorage.getItem('employeeId') || '';
        if (storedId) {
          this.loggedInEmployeeId = storedId;
          this.employeeId = storedId;
          this.selectedEmployeeId = storedId;
        }

        // Instant local restoration so UI is immediately in Clock-Out state if previously active
        // ALWAYS for the logged-in user!
        const savedClockIn = localStorage.getItem(`activeClockIn_${this.loggedInEmployeeId}`);
        if (savedClockIn) {
          const d = this.parseDateSafe(savedClockIn);
          if (d) {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const savedStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            if (savedStr === todayStr) {
              this.isClockedIn = true;
              this.clockInTime = d;
            } else {
              localStorage.removeItem(`activeClockIn_${this.loggedInEmployeeId}`);
            }
          }
        }
      }
      this.getAllData();
    } else {
      this.currentTimeDisplay = '09:00:00 AM';
      this.currentDateDisplay = 'Monday, 12 August 2026';
    }

    this.filterSub = this.globalFilterService.filters$.subscribe(f => {
      let needsDataReload = false;

      // Employee filter for Admin/HR/Manager
      if (f.employeeId !== undefined) {
        const storedId = typeof localStorage !== 'undefined' ? (localStorage.getItem('employeeId') || '') : '';
        const targetId = f.employeeId === 'All' ? storedId : String(f.employeeId);
        this.selectedEmployeeId = f.employeeId === 'All' ? 'All' : String(f.employeeId);
        this.selectedEmployeeName = f.employeeName || '';
        this.loadWorkModelState();
        if (targetId && targetId !== this.employeeId) {
          this.employeeId = targetId;
          needsDataReload = true;
        }
      }

      // Sort order
      if (f.sortOrder && f.sortOrder !== this.sortOrder) {
        this.sortOrder = f.sortOrder;
      }

      // Month filter
      if (f.month && f.month !== 'All') {
        const parsed = new Date(f.month + ' 1');
        if (!isNaN(parsed.getTime())) {
          const currentM = this.calendarDate.getMonth();
          const currentY = this.calendarDate.getFullYear();
          if (parsed.getMonth() !== currentM || parsed.getFullYear() !== currentY) {
            this.calendarDate = parsed;
            needsDataReload = true;
          }
        }
      }

      // Search & status filter
      this.searchQuery = f.search || '';
      this.selectedStatus = f.status || 'All';

      if (needsDataReload) {
        this.getAllData();
      } else if (this.allRows.length > 0) {
        this.filterAttendance();
      }
    });

    this.routeSub = this.route.queryParams.subscribe(params => {
      const empId = params['employeeId'];
      if (empId && String(empId) !== 'All') {
        const targetId = String(empId);
        this.employeeId = targetId;
        this.selectedEmployeeId = targetId;
        const name = params['employeeName'] || '';
        if (name) {
          this.selectedEmployeeName = name;
          this.globalFilterService.setEmployee(Number(targetId), name);
          this.getAllData();
        } else {
          this.employeeService.getData().subscribe((emps: any) => {
            const list = Array.isArray(emps) ? emps : (emps?.data || emps?.result || []);
            const found = list.find((e: any) => String(e.id || e.employeeId) === targetId);
            if (found) {
              this.selectedEmployeeName = `${found.firstName || ''} ${found.lastName || ''}`.trim();
              this.globalFilterService.setEmployee(Number(targetId), this.selectedEmployeeName);
            }
            this.getAllData();
          });
        }
      }
    });

    // Sync reactive punch & session state with AttendanceStateService (single source of truth)
    this.clockedInSub = this.attendanceStateService.isClockedIn$.subscribe(isClocked => {
      this.isClockedIn = isClocked;
    });

    this.sessionElapsedSub = this.attendanceStateService.sessionElapsed$.subscribe(duration => {
      this.activeSessionDuration = duration;
    });

    this.clockInTimeSub = this.attendanceStateService.clockInTime$.subscribe(time => {
      this.clockInTime = time;
    });

    this.isTodayRegularizedSub = this.attendanceStateService.isTodayRegularized$.subscribe(isReg => {
      this.isTodayRegularized = isReg;
    });

    this.regularizedStatusLabelSub = this.attendanceStateService.regularizedStatusLabel$.subscribe(label => {
      this.regularizedStatusLabel = label;
    });

    // Sync with punches triggered from the top header
    this.punchSub = this.attendanceStateService.punchChanged$.subscribe(() => {
      this.getAllData();
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    if (this.filterSub) this.filterSub.unsubscribe();
    if (this.punchSub) this.punchSub.unsubscribe();
    if (this.clockedInSub) this.clockedInSub.unsubscribe();
    if (this.sessionElapsedSub) this.sessionElapsedSub.unsubscribe();
    if (this.clockInTimeSub) this.clockInTimeSub.unsubscribe();
    if (this.isTodayRegularizedSub) this.isTodayRegularizedSub.unsubscribe();
    if (this.regularizedStatusLabelSub) this.regularizedStatusLabelSub.unsubscribe();
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  private initClock() {
    if (typeof window === 'undefined') return;
    this.updateClock();
    this.timerInterval = setInterval(() => this.updateClock(), 1000);
  }

  private updateClock() {
    const now = new Date();
    this.currentTimeDisplay = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    this.currentDateDisplay = now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (this.isClockedIn && this.clockInTime) {
      const diffMs = now.getTime() - this.clockInTime.getTime();
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      this.activeSessionDuration = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
  }

  allRequests: any[] = [];

  parseDateSafe(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) return null;

    // Backend stores UTC DateTime in SQL Server which EF Core serializes without 'Z'
    if (!s.endsWith('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
      s += 'Z';
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  formatTimeDisplay(timeStr?: string | null): string {
    if (!timeStr) return '--';
    let s = String(timeStr).trim();
    if (!s || s === '--' || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) return '--';

    // If already formatted with AM/PM
    if (/(?:AM|PM)$/i.test(s)) {
      return s;
    }

    // If simple HH:mm like "09:30"
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [hStr, mStr] = s.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${mStr} ${ampm}`;
    }

    // Convert from UTC to local browser timezone standard (e.g. IST)
    const d = this.parseDateSafe(s);
    if (!d || isNaN(d.getTime()) || d.getFullYear() < 2000) return '--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private toYMD(val: any): string {
    if (!val) return '';
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }
    const d = this.parseDateSafe(val);
    if (!d) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  isHolidayStatus(status?: string): boolean {
    if (!status) return false;
    return status.toLowerCase().includes('holiday');
  }

  isLeaveStatus(status?: string): boolean {
    if (!status) return false;
    const s = status.toLowerCase();
    return s.includes('leave');
  }

  isRealTime(t?: any): boolean {
    if (!t) return false;
    const s = String(t).trim();
    if (!s || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) {
      return false;
    }
    const dt = this.parseDateSafe(s);
    return !!dt && dt.getFullYear() > 2000;
  }

  getAllData() {
    forkJoin({
      attendance: this.services.getAllData().pipe(catchError(() => of([]))),
      requests: this.attRequestService.getAllData().pipe(catchError(() => of([]))),
      leaves: this.emailService.getData().pipe(catchError(() => of([]))),
      holidays: this.holidayService.getHoliday().pipe(catchError(() => of([]))),
      logs: this.services.getAttendanceLogs().pipe(catchError(() => of([]))),
      empProfile: this.employeeService.getEmployeeById(this.employeeId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ attendance, requests, leaves, holidays, logs, empProfile }: any) => {
        const empData = empProfile?.data || empProfile;
        if (empData) {
          const doj = empData.dateOfJoining || empData.DateOfJoining || empData.joiningDate;
          if (doj) {
            this.joiningDate = new Date(doj);
            this.joiningDateStr = this.toYMD(this.joiningDate);
          }
        }

        let rawAttendance: any[] = [];
        if (Array.isArray(attendance)) {
          rawAttendance = attendance;
        } else if (attendance && Array.isArray(attendance.data)) {
          rawAttendance = attendance.data;
        }

        let rawRequests: any[] = [];
        if (Array.isArray(requests)) {
          rawRequests = requests;
        } else if (requests && Array.isArray(requests.data)) {
          rawRequests = requests.data;
        }

        let rawLeaves: any[] = [];
        if (Array.isArray(leaves)) {
          rawLeaves = leaves;
        } else if (leaves && Array.isArray(leaves.data)) {
          rawLeaves = leaves.data;
        } else if (leaves && Array.isArray(leaves.result)) {
          rawLeaves = leaves.result;
        }

        let rawHolidays: any[] = [];
        if (Array.isArray(holidays)) {
          rawHolidays = holidays;
        } else if (holidays && Array.isArray(holidays.data)) {
          rawHolidays = holidays.data;
        }

        let rawLogs: any[] = [];
        if (Array.isArray(logs)) {
          rawLogs = logs;
        } else if (logs && Array.isArray(logs.data)) {
          rawLogs = logs.data;
        }

        this.allRequests = rawRequests;

        const getEmpId = (item: any) => String(item.employeeId ?? item.EmployeeId ?? item.requestedBy ?? item.RequestedBy ?? item.employee?.id ?? item.Employee?.Id ?? '').trim();
        const currentId = String(this.employeeId || '').trim();

        let employeeRecords: any[] = [];
        if (currentId) {
          employeeRecords = rawAttendance.filter((item: any) => getEmpId(item) === currentId);
        } else {
          employeeRecords = rawAttendance;
        }

        let employeeRequests = rawRequests;
        if (currentId) {
          employeeRequests = rawRequests.filter((item: any) => getEmpId(item) === currentId);
        }

        let employeeLeaves: any[] = [];
        if (currentId) {
          employeeLeaves = rawLeaves.filter((item: any) => getEmpId(item) === currentId);
        } else {
          employeeLeaves = rawLeaves;
        }

        let employeeLogs: any[] = [];
        if (currentId) {
          employeeLogs = rawLogs.filter((item: any) => getEmpId(item) === currentId);
        } else {
          employeeLogs = rawLogs;
        }

        // Active Clock-In Session Resolution (Strictly for the Authenticated Logged-In User)
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

        const loggedInId = String(this.loggedInEmployeeId || '').trim();
        const loggedInLogs = rawLogs.filter((item: any) => getEmpId(item) === loggedInId);
        const todayLoggedInLogs = loggedInLogs.filter((l: any) => {
          const d = l.attendanceDate || l.AttendanceDate;
          return d && this.toYMD(d) === todayDateStr;
        });

        // 1. Check if there is an active session in AttendanceLog for logged-in user
        const activeLog = todayLoggedInLogs.find((l: any) => {
          const inT = l.inTime || l.InTime;
          const outT = l.outTime || l.OutTime;
          return this.isRealTime(inT) && !this.isRealTime(outT);
        });

        // 2. Check today's EmployeeAttendance record for logged-in user
        const todayLoggedInAttendance = rawAttendance.find((r: any) => {
          const ad = r.attendanceDate || r.AttendanceDate;
          return getEmpId(r) === loggedInId && ad && this.toYMD(ad) === todayDateStr;
        });

        const hasOpenAttendance = todayLoggedInAttendance && this.isRealTime(todayLoggedInAttendance.clockIn || todayLoggedInAttendance.ClockIn) && !this.isRealTime(todayLoggedInAttendance.clockOut || todayLoggedInAttendance.ClockOut);

        if (activeLog) {
          const inTime = this.parseDateSafe(activeLog.inTime || activeLog.InTime);
          this.attendanceStateService.setClockedInState(true, inTime);
        } else if (hasOpenAttendance) {
          const inTime = this.parseDateSafe(todayLoggedInAttendance.clockIn || todayLoggedInAttendance.ClockIn);
          this.attendanceStateService.setClockedInState(true, inTime);
          // If no active session for logged-in user, check if closed attendance exists today
          const hasClosedAttendance = todayLoggedInAttendance && this.isRealTime(todayLoggedInAttendance.clockOut || todayLoggedInAttendance.ClockOut);
          const hasAnyLogs = todayLoggedInLogs.length > 0;
          if (hasClosedAttendance || (!todayLoggedInAttendance && hasAnyLogs)) {
            const firstInTime = this.parseDateSafe(todayLoggedInAttendance?.clockIn || todayLoggedInAttendance?.ClockIn) || (todayLoggedInLogs.length > 0 ? this.parseDateSafe(todayLoggedInLogs[0].inTime || todayLoggedInLogs[0].InTime) : null);
            const lastOutTime = this.parseDateSafe(todayLoggedInAttendance?.clockOut || todayLoggedInAttendance?.ClockOut) || (todayLoggedInLogs.length > 0 ? this.parseDateSafe(todayLoggedInLogs[todayLoggedInLogs.length - 1].outTime || todayLoggedInLogs[todayLoggedInLogs.length - 1].OutTime) : null);

            let totalHoursDecimal = Number(todayLoggedInAttendance?.totalHours ?? todayLoggedInAttendance?.TotalHours ?? todayLoggedInAttendance?.effectiveHours ?? todayLoggedInAttendance?.EffectiveHours ?? 0);
            if (totalHoursDecimal <= 0 && firstInTime && lastOutTime) {
              const diffMs = Math.max(0, lastOutTime.getTime() - firstInTime.getTime());
              totalHoursDecimal = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }

            const durationStr = this.attendanceStateService.formatDurationFromHours(totalHoursDecimal, firstInTime, lastOutTime);
            this.attendanceStateService.setClockedOutState(firstInTime, lastOutTime, durationStr);
          } else {
            this.attendanceStateService.setClockedInState(false, null);
          }
        }

        this.cachedRecords = employeeRecords;
        this.cachedRequests = employeeRequests;
        this.cachedLeaves = employeeLeaves;
        this.cachedHolidays = rawHolidays;
        this.cachedLogs = employeeLogs;

        this.buildMonthCalendar();
        this.generateLast30DaysRows(employeeRecords, employeeRequests, employeeLeaves, rawHolidays, employeeLogs);
        this.loadWorkModelState();
      },
      error: () => {
        this.cachedRecords = [];
        this.cachedRequests = [];
        this.cachedLeaves = [];
        this.cachedHolidays = [];
        this.cachedLogs = [];
        this.buildMonthCalendar();
        this.generateLast30DaysRows([], [], [], [], []);
      }
    });
  }

  get calendarMonthTitle(): string {
    return this.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get currentMonthIndex(): number {
    return this.calendarDate.getMonth();
  }

  get currentYear(): number {
    return this.calendarDate.getFullYear();
  }

  prevMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.buildMonthCalendar();
  }

  nextMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.buildMonthCalendar();
  }

  goToToday() {
    this.calendarDate = new Date();
    this.buildMonthCalendar();
  }

  onMonthChange(mVal: any) {
    const m = Number(mVal);
    this.calendarDate = new Date(this.calendarDate.getFullYear(), m, 1);
    this.buildMonthCalendar();
  }

  onYearChange(yVal: any) {
    const y = Number(yVal);
    this.calendarDate = new Date(y, this.calendarDate.getMonth(), 1);
    this.buildMonthCalendar();
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day;
  }

  closeDayDetail() {
    this.selectedDay = null;
  }

  evaluateAttendanceForDate(
    d: Date,
    records: any[] = [],
    requests: any[] = [],
    leaves: any[] = [],
    holidays: any[] = [],
    logs: any[] = []
  ): AttendanceRow {
    const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[d.getDay()];

    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const targetEmpId = this.effectiveTargetEmployeeId;
    const workMode = this.workModelService.getWorkModelForDate(targetEmpId, dateStr);

    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const formattedDate = `${d.toLocaleDateString('en-GB', options)}, ${dayName}`;

    const today = new Date();
    const isToday = this.toYMD(today) === dateStr;

    // Check Holiday
    let holidayName = '';
    const holidayMatch = holidays.find((h: any) => {
      if (h.isActive === false || h.isActive === 0 || h.isDeleted) return false;
      const hd = h.holidayDate || h.HolidayDate;
      if (!hd) return false;
      return this.toYMD(hd) === dateStr;
    });
    if (holidayMatch) {
      holidayName = holidayMatch.holidayName || holidayMatch.HolidayName || 'Holiday';
    }

    // Check Approved or Pending Leave
    let leaveTypeName = '';
    const leaveMatch = leaves.find((l: any) => {
      const st = String(l.status || l.Status || '').toLowerCase().trim();
      if (st !== 'approved' && st !== 'pending') return false;
      if (l.isDeleted === 1 || l.isDeleted === true) return false;
      const start = this.toYMD(l.startDate || l.StartDate || l.fromDate || l.FromDate);
      const end = this.toYMD(l.endDate || l.EndDate || l.toDate || l.ToDate) || start;
      if (!start) return false;
      return dateStr >= start && dateStr <= end;
    });
    if (leaveMatch) {
      const isPending = String(leaveMatch.status || leaveMatch.Status || '').toLowerCase().trim() === 'pending';
      const baseType = leaveMatch.leaveTypeName || leaveMatch.LeaveTypeName || leaveMatch.leaveName || leaveMatch.type || 'On Leave';
      leaveTypeName = isPending ? `${baseType} (Pending)` : baseType;
    }

    // Check matching punch record in DB
    const match = records.find((r: any) => {
      const ad = r.attendanceDate || r.AttendanceDate;
      if (ad && this.toYMD(ad) === dateStr) return true;
      const ci = r.clockIn || r.ClockIn;
      if (ci && this.toYMD(ci) === dateStr) return true;
      return false;
    });

    // Check logs for this date
    const dayLogs = logs.filter((l: any) => {
      const dDate = l.attendanceDate || l.AttendanceDate;
      if (dDate && this.toYMD(dDate) === dateStr) return true;
      const inT = l.inTime || l.InTime;
      if (inT && this.toYMD(inT) === dateStr) return true;
      return false;
    });

    // Match regularization request for this date robustly
    const dateRequests = requests.filter((req: any) => {
      const rawDate = req.requestedDate || req.RequestedDate || req.attendanceDate || req.AttendanceDate;
      if (!rawDate) return false;
      const dt = new Date(rawDate);
      let localDateStr = '';
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = (dt.getMonth() + 1).toString().padStart(2, '0');
        const day = dt.getDate().toString().padStart(2, '0');
        localDateStr = `${y}-${m}-${day}`;
      }
      const sliceStr = String(rawDate).slice(0, 10);
      return localDateStr === dateStr || sliceStr === dateStr;
    });

    const reqMatch = dateRequests.find((r: any) => {
      const s = String(r.status || r.Status || '').toLowerCase().trim();
      return s === 'pending' || s === 'approved';
    }) || (dateRequests.length > 0 ? dateRequests[dateRequests.length - 1] : null);

    let regularizationStatus: 'Pending' | 'Approved' | 'Rejected' | null = null;
    let isRegularized = false;
    let canRegularize = !isWeekend && !holidayMatch && !leaveMatch;
    let rejectionReason = '';

    if (reqMatch) {
      const s = String(reqMatch.status || reqMatch.Status || '').toLowerCase().trim();
      if (s === 'approved') {
        regularizationStatus = 'Approved';
        isRegularized = true;
        canRegularize = false;
      } else if (s === 'pending') {
        regularizationStatus = 'Pending';
        canRegularize = false;
      } else if (s === 'rejected') {
        regularizationStatus = 'Rejected';
        canRegularize = !isWeekend && !holidayMatch && !leaveMatch;
        rejectionReason = reqMatch.rejectionReason || reqMatch.RejectionReason || '';
      }
    }

    let status: string = '';
    let isHoliday = false;
    let isLeave = false;
    let clockIn = '';
    let clockOut = '';
    let clockInDisplay = '--';
    let clockOutDisplay = '--';
    let totalHrsDisplay = '--';
    let effectiveHrsDisplay = '--';
    let overtimeDisplay = '--';
    let isOvertime = false;
    let totalHrsDec = 0;

    const validInTimes: number[] = [];
    const validOutTimes: number[] = [];
    const allInStrs: (string | null | undefined)[] = [];
    const allOutStrs: (string | null | undefined)[] = [];

    const hasLogsForDate = dayLogs.length > 0;
    const shouldUseMatch = !isToday || hasLogsForDate;

    for (const l of dayLogs) {
      const inT = l.inTime || l.InTime;
      const outT = l.outTime || l.OutTime;
      if (this.isRealTime(inT)) {
        const t = this.parseDateSafe(inT)?.getTime();
        if (t) {
          validInTimes.push(t);
          allInStrs.push(inT);
        }
      }
      if (this.isRealTime(outT)) {
        const t = this.parseDateSafe(outT)?.getTime();
        if (t) {
          validOutTimes.push(t);
          allOutStrs.push(outT);
        }
      }
    }

    if (shouldUseMatch && match) {
      const ci = match.clockIn || match.ClockIn;
      const co = match.clockOut || match.ClockOut;
      if (this.isRealTime(ci)) {
        const t = this.parseDateSafe(ci)?.getTime();
        if (t) {
          validInTimes.push(t);
          allInStrs.push(ci);
        }
      }
      if (this.isRealTime(co)) {
        const t = this.parseDateSafe(co)?.getTime();
        if (t) {
          validOutTimes.push(t);
          allOutStrs.push(co);
        }
      }
    }

    let rawEarliestIn: string | null = null;
    if (validInTimes.length > 0) {
      const minTime = Math.min(...validInTimes);
      rawEarliestIn = allInStrs.find(s => s && this.parseDateSafe(s)?.getTime() === minTime) || null;
    }

    let rawLatestOut: string | null = null;
    if (validOutTimes.length > 0) {
      const maxTime = Math.max(...validOutTimes);
      rawLatestOut = allOutStrs.find(s => s && this.parseDateSafe(s)?.getTime() === maxTime) || null;
    }

    const hasActiveSession = (isToday && this.isClockedIn) || dayLogs.some((l: any) => this.isRealTime(l.inTime || l.InTime) && !this.isRealTime(l.outTime || l.OutTime));
    const hasPunchToday = isToday && (this.isClockedIn || hasLogsForDate);

    const todayDateStr = this.toYMD(new Date());
    const isPastDate = dateStr < todayDateStr;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = this.toYMD(thirtyDaysAgo);
    const isWithinBackfillWindow = dateStr >= thirtyDaysAgoStr && isPastDate;

    const isPriorToJoining = !!(this.joiningDateStr && dateStr < this.joiningDateStr);

    let breakHoursDec = 0;
    let breakTimeDisplay = '00h 00m';
    const breaksList: BreakInterval[] = [];
    const sessionsList: PunchSession[] = [];

    // 1. Sort punch logs chronologically by InTime
    const sortedDayLogs = [...dayLogs]
      .filter((l: any) => this.isRealTime(l.inTime || l.InTime))
      .sort((a: any, b: any) => {
        const tA = this.parseDateSafe(a.inTime || a.InTime)?.getTime() || 0;
        const tB = this.parseDateSafe(b.inTime || b.InTime)?.getTime() || 0;
        return tA - tB;
      });

    // 2. Build structured working punch sessions
    sortedDayLogs.forEach((log: any, idx: number) => {
      const inT = log.inTime || log.InTime;
      const outT = log.outTime || log.OutTime;
      const durHours = Number(log.duration || log.Duration) || 0;
      const isLastActive = hasActiveSession && idx === sortedDayLogs.length - 1;
      sessionsList.push({
        sessionNumber: idx + 1,
        inTime: this.formatTimeDisplay(inT),
        outTime: this.isRealTime(outT) ? this.formatTimeDisplay(outT) : (isLastActive ? 'Active (In Progress)' : '--'),
        durationHours: durHours,
        durationDisplay: durHours > 0 ? this.formatHoursToHm(durHours) : (isLastActive ? this.activeSessionDuration : '--')
      });
    });

    // 3. Compute automatic break intervals between consecutive sessions
    let totalBreakMins = 0;
    for (let i = 0; i < sortedDayLogs.length - 1; i++) {
      const currOut = sortedDayLogs[i].outTime || sortedDayLogs[i].OutTime;
      const nextIn = sortedDayLogs[i + 1].inTime || sortedDayLogs[i + 1].InTime;
      if (this.isRealTime(currOut) && this.isRealTime(nextIn)) {
        const dOut = this.parseDateSafe(currOut);
        const dIn = this.parseDateSafe(nextIn);
        if (dOut && dIn && dIn.getTime() > dOut.getTime()) {
          const diffMs = dIn.getTime() - dOut.getTime();
          const mins = Math.round(diffMs / (1000 * 60));
          if (mins > 0) {
            totalBreakMins += mins;
            breaksList.push({
              breakNumber: breaksList.length + 1,
              startTime: this.formatTimeDisplay(currOut),
              endTime: this.formatTimeDisplay(nextIn),
              durationMinutes: mins,
              durationDisplay: this.formatHoursToHm(mins / 60)
            });
          }
        }
      }
    }
    if (totalBreakMins > 0) {
      breakHoursDec = Number((totalBreakMins / 60).toFixed(2));
      breakTimeDisplay = this.formatHoursToHm(breakHoursDec);
    }

    if (isPriorToJoining) {
      status = 'Not Joined Yet';
      canRegularize = false;
    } else if (isWeekend) {
      status = 'Week Off';
      canRegularize = false;
    } else if (holidayMatch) {
      status = holidayName || 'Holiday';
      isHoliday = true;
      canRegularize = false;
    } else if (leaveMatch) {
      status = leaveTypeName || 'On Leave';
      isLeave = true;
      canRegularize = false;
    } else if (isRegularized) {
      status = 'Present';
      canRegularize = false;

      const reqIn = reqMatch.checkIn || reqMatch.CheckIn || reqMatch.clockIn || reqMatch.ClockIn;
      const reqOut = reqMatch.checkOut || reqMatch.CheckOut || reqMatch.clockOut || reqMatch.ClockOut;
      clockInDisplay = reqIn ? this.formatTimeDisplay(reqIn) : '09:30 AM';
      clockOutDisplay = reqOut ? this.formatTimeDisplay(reqOut) : '06:30 PM';
      totalHrsDec = 9.0;
      totalHrsDisplay = '09h 00m';
      effectiveHrsDisplay = '08h 00m';
      breakHoursDec = 1.0;
      breakTimeDisplay = '01h 00m';
      if (breaksList.length === 0) {
        breaksList.push({
          breakNumber: 1,
          startTime: '01:00 PM',
          endTime: '02:00 PM',
          durationMinutes: 60,
          durationDisplay: '01h 00m'
        });
      }
    } else if (rawEarliestIn || hasPunchToday) {
      status = 'Present';

      clockIn = rawEarliestIn || (this.clockInTime ? this.clockInTime.toISOString() : '');
      clockInDisplay = this.formatTimeDisplay(clockIn);

      if (hasActiveSession) {
        clockOutDisplay = '--';
        const completedLogsDuration = sortedDayLogs.filter((l: any) => this.isRealTime(l.outTime || l.OutTime))
          .reduce((sum: number, l: any) => sum + (Number(l.duration || l.Duration) || 0), 0);
        const currentDuration = this.clockInTime ? Math.max(0, (today.getTime() - this.clockInTime.getTime()) / 3600000) : 0;
        const totalEffective = Number((completedLogsDuration + currentDuration).toFixed(2));
        totalHrsDec = Number((totalEffective + breakHoursDec).toFixed(2));
        totalHrsDisplay = this.formatHoursToHm(totalHrsDec);
        effectiveHrsDisplay = this.formatHoursToHm(totalEffective);
      } else {
        clockOut = rawLatestOut || '';
        clockOutDisplay = this.formatTimeDisplay(clockOut);

        const dIn = rawEarliestIn ? this.parseDateSafe(rawEarliestIn) : null;
        const dOut = rawLatestOut ? this.parseDateSafe(rawLatestOut) : null;
        const grossSpan = (dIn && dOut && dOut.getTime() > dIn.getTime())
          ? Number(((dOut.getTime() - dIn.getTime()) / 3600000).toFixed(2))
          : 0;

        const sumWorkSessions = sortedDayLogs.reduce((sum: number, l: any) => sum + (Number(l.duration || l.Duration) || 0), 0);

        if (grossSpan > 0) {
          totalHrsDec = grossSpan;
          const eff = sumWorkSessions > 0 ? sumWorkSessions : Math.max(0, grossSpan - breakHoursDec);
          effectiveHrsDisplay = this.formatHoursToHm(eff);
        } else if (match?.totalHours) {
          totalHrsDec = Number(match.totalHours);
          const eff = match.effectiveHours ? Number(match.effectiveHours) : Math.max(0, totalHrsDec - breakHoursDec);
          effectiveHrsDisplay = this.formatHoursToHm(eff);
        } else {
          const eff = sumWorkSessions > 0 ? sumWorkSessions : 0;
          totalHrsDec = Number((eff + (eff > 0 ? breakHoursDec : 0)).toFixed(2));
          effectiveHrsDisplay = this.formatHoursToHm(eff);
        }
        totalHrsDisplay = this.formatHoursToHm(totalHrsDec);
      }

      if (totalHrsDec > 8.0) {
        overtimeDisplay = `+${this.formatHoursToHm(totalHrsDec - 8.0)}`;
        isOvertime = true;
      }

      // Allow regularization if punch was incomplete on a past date within backfill window
      const missedPunchOut = isPastDate && (!rawLatestOut || hasActiveSession);
      canRegularize = isWithinBackfillWindow && missedPunchOut && regularizationStatus !== 'Pending' && regularizationStatus !== 'Approved' && !holidayMatch && !leaveMatch && !isWeekend;
    } else {
      status = 'Absent';
      canRegularize = isPastDate && isWithinBackfillWindow && regularizationStatus !== 'Pending' && regularizationStatus !== 'Approved' && !holidayMatch && !leaveMatch && !isWeekend;
    }

    let punchType: 'Self Punch' | 'Regularized' | 'None' = 'None';
    if (isRegularized) {
      punchType = 'Regularized';
    } else if ((rawEarliestIn || hasPunchToday) && !isWeekend) {
      punchType = 'Self Punch';
    }

    return {
      dateObj: d,
      dateStr,
      dayName,
      formattedDate,
      isWeekend,
      isHoliday,
      isLeave,
      isPriorToJoining,
      leaveRecord: leaveMatch || null,
      leaveTypeName: leaveTypeName || undefined,
      status,
      clockIn,
      clockOut,
      clockInDisplay,
      clockOutDisplay,
      totalHoursDecimal: totalHrsDec,
      effectiveHoursDecimal: Math.max(0, totalHrsDec - breakHoursDec),
      breakHoursDecimal: breakHoursDec,
      totalHoursDisplay: totalHrsDisplay,
      effectiveHoursDisplay: effectiveHrsDisplay,
      breakTimeDisplay: breakTimeDisplay,
      breaks: breaksList,
      punchSessions: sessionsList,
      overtimeDisplay,
      isOvertime,
      isRegularized,
      regularizationStatus,
      rejectionReason,
      canRegularize,
      punchType,
      workMode,
      rawItem: match || { Date: formattedDate, clockIn, clockOut }
    };
  }

  getBreakTooltip(row?: AttendanceRow | null): string {
    if (!row || !row.breaks || row.breaks.length === 0) {
      return 'No breaks recorded';
    }
    return row.breaks.map(b => `Break #${b.breakNumber}: ${b.startTime} - ${b.endTime} (${b.durationDisplay})`).join('\n');
  }

  buildMonthCalendar() {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const calendarDays: CalendarDay[] = [];

    const todayStr = this.toYMD(new Date());

    let mPresent = 0;
    let mAbsent = 0;
    let mLeaves = 0;
    let mHolidays = 0;
    let mWeekOffs = 0;
    let mWorkingDays = 0;
    let mTotalHrsDec = 0;
    let mOvertimeDec = 0;

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const row = this.evaluateAttendanceForDate(
        d,
        this.cachedRecords,
        this.cachedRequests,
        this.cachedLeaves,
        this.cachedHolidays,
        this.cachedLogs
      );
      calendarDays.push({
        ...row,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: this.toYMD(d) === todayStr,
        holidayName: row.isHoliday ? row.status : undefined,
        leaveType: row.isLeave ? row.status : undefined
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const row = this.evaluateAttendanceForDate(
        d,
        this.cachedRecords,
        this.cachedRequests,
        this.cachedLeaves,
        this.cachedHolidays,
        this.cachedLogs
      );

      const isCurrentDayToday = this.toYMD(d) === todayStr;

      if (row.isPriorToJoining) {
        // Not joined yet: do not increment working days or absent count
      } else if (row.isWeekend) {
        mWeekOffs++;
      } else if (row.isHoliday) {
        mHolidays++;
      } else if (row.isLeave) {
        mLeaves++;
        mWorkingDays++;
      } else if (row.status === 'Present') {
        mPresent++;
        mWorkingDays++;
        mTotalHrsDec += row.totalHoursDecimal || 0;
        if (row.isOvertime && (row.totalHoursDecimal || 0) > 8.0) {
          mOvertimeDec += (row.totalHoursDecimal || 0) - 8.0;
        }
      } else {
        if (d <= new Date()) {
          mAbsent++;
          mWorkingDays++;
        }
      }

      calendarDays.push({
        ...row,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isCurrentDayToday,
        holidayName: row.isHoliday ? row.status : undefined,
        leaveType: row.isLeave ? row.status : undefined
      });
    }

    // Next month padding days
    const remaining = (7 - (calendarDays.length % 7)) % 7;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const d = new Date(year, month + 1, nextDay);
      const row = this.evaluateAttendanceForDate(
        d,
        this.cachedRecords,
        this.cachedRequests,
        this.cachedLeaves,
        this.cachedHolidays,
        this.cachedLogs
      );
      calendarDays.push({
        ...row,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: this.toYMD(d) === todayStr,
        holidayName: row.isHoliday ? row.status : undefined,
        leaveType: row.isLeave ? row.status : undefined
      });
    }

    // Chunk into 7-day weeks
    this.calendarWeeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      this.calendarWeeks.push(calendarDays.slice(i, i + 7));
    }

    // Compute Calendar KPIs
    this.calendarMonthPresent = mPresent;
    this.calendarMonthAbsent = mAbsent;
    this.calendarMonthLeaves = mLeaves;
    this.calendarMonthHolidays = mHolidays;
    this.calendarMonthWeekOffs = mWeekOffs;
    this.calendarMonthWorkingDays = Math.max(1, mWorkingDays);
    this.calendarMonthCompliance = Math.min(100, Math.round((mPresent / this.calendarMonthWorkingDays) * 100));

    const avgDec = mPresent > 0 ? (mTotalHrsDec / mPresent) : 0;
    this.calendarMonthAvgHours = avgDec > 0 ? this.formatHoursToHm(avgDec) : '00h 00m';
    this.calendarMonthOvertime = mOvertimeDec > 0 ? `+${this.formatHoursToHm(mOvertimeDec)}` : '00h 00m';

    // Auto-select day
    if (!this.selectedDay || this.selectedDay.dateObj.getMonth() !== month) {
      const todayDay = calendarDays.find(cd => cd.isCurrentMonth && cd.isToday);
      this.selectedDay = todayDay || calendarDays.find(cd => cd.isCurrentMonth) || calendarDays[0] || null;
    } else {
      const found = calendarDays.find(cd => cd.dateStr === this.selectedDay?.dateStr);
      if (found) this.selectedDay = found;
    }
  }

  private generateLast30DaysRows(records: any[], requests: any[] = [], leaves: any[] = [], holidays: any[] = [], logs: any[] = []) {
    const today = new Date();
    const rows: AttendanceRow[] = [];

    let totalHrsSum = 0;
    let presentCount = 0;
    let workingDaysCount = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      const row = this.evaluateAttendanceForDate(d, records, requests, leaves, holidays, logs);
      if (row.isPriorToJoining) {
        continue;
      }

      if (row.status === 'Present') {
        presentCount++;
        workingDaysCount++;
        totalHrsSum += row.totalHoursDecimal || 0;
      } else if (row.isLeave) {
        workingDaysCount++;
      } else if (!row.isWeekend && !row.isHoliday) {
        workingDaysCount++;
      }

      rows.push(row);
    }

    this.allRows = rows;
    this.presentDaysCount = presentCount;
    this.totalWorkingDays = Math.max(1, workingDaysCount);
    this.complianceRate = Math.min(100, Math.round((presentCount / this.totalWorkingDays) * 100));

    const avgDec = presentCount > 0 ? (totalHrsSum / presentCount) : 0;
    this.avgWorkingHours = avgDec > 0 ? this.formatHoursToHm(avgDec) : '00h 00m';

    // Detect past incomplete punch (missed Clock-Out) within 30 days
    const todayStr = this.toYMD(new Date());
    if (!this.isMissingPunchDismissed && !this.isViewingOtherEmployee) {
      this.missingPunchDay = this.allRows.find(r =>
        r.dateStr < todayStr &&
        !r.isWeekend &&
        !r.isHoliday &&
        !r.isLeave &&
        r.canRegularize &&
        r.clockInDisplay &&
        r.clockInDisplay !== '--' &&
        (!r.clockOutDisplay || r.clockOutDisplay === '--') &&
        r.regularizationStatus !== 'Pending' &&
        r.regularizationStatus !== 'Approved'
      ) || null;
    }

    this.filterAttendance();
  }

  private formatHoursToHm(dec: number): string {
    if (!dec || isNaN(dec) || dec <= 0) return '00h 00m';
    const hrs = Math.floor(dec);
    const mins = Math.round((dec - hrs) * 60);
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  }

  filterAttendance() {
    let result = [...this.allRows];

    // Search query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.formattedDate.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.dateStr.includes(q)
      );
    }

    // Status filter
    if (this.selectedStatus !== 'All') {
      if (this.selectedStatus === 'On Leave') {
        result = result.filter(r => r.isLeave || this.isLeaveStatus(r.status));
      } else if (this.selectedStatus === 'Holiday') {
        result = result.filter(r => r.isHoliday || this.isHolidayStatus(r.status));
      } else if (this.selectedStatus === 'Week Off') {
        result = result.filter(r => r.isWeekend || r.status === 'Week Off');
      } else {
        result = result.filter(r => r.status === this.selectedStatus);
      }
    }

    if (this.sortOrder === 'asc') {
      result.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    } else {
      result.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }

    this.filteredRows = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRows = this.filteredRows.slice(startIndex, endIndex);
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

  openClockInDialog() {
    if (this.isViewingOtherEmployee) {
      this.toaster.warning('Clock in/out can only be performed by the employee directly.', 'Action Restricted');
      return;
    }
    if (this.isTodayRegularized) {
      this.toaster.warning("Today's attendance has been regularized. Clock-in and clock-out are disabled for today.", 'Attendance Regularized');
      return;
    }

    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '430px',
      data: {
        title: 'Confirm Clock-In',
        message: `Are you ready to record your Clock-In for today (${this.currentDateDisplay})?`,
        punchType: 'clockIn',
        confirmText: 'Clock-In',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res === 'success') {
        this.getAllData();
      } else if (res === 'confirm') {
        this.startClock();
      }
    });
  }

  openClockOutDialog() {
    if (this.isViewingOtherEmployee) {
      this.toaster.warning('Clock in/out can only be performed by the employee directly.', 'Action Restricted');
      return;
    }
    if (this.isTodayRegularized) {
      this.toaster.warning("Today's attendance has been regularized. Clock-in and clock-out are disabled for today.", 'Attendance Regularized');
      return;
    }

    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '430px',
      data: {
        title: 'Confirm Clock-Out',
        message: 'Are you sure you want to end your working session and Clock-Out?',
        punchType: 'clockOut',
        confirmText: 'Clock-Out',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res === 'success') {
        this.clockInTime = null;
        this.activeSessionDuration = '00h 00m 00s';
        this.getAllData();
      } else if (res === 'confirm') {
        this.onClockOut();
      }
    });
  }

  startClock() {
    if (this.isViewingOtherEmployee) {
      this.toaster.warning('Clock in/out can only be performed by the employee directly.', 'Action Restricted');
      return;
    }
    if (this.isTodayRegularized) {
      this.toaster.warning("Today's attendance has been regularized. Clock-in and clock-out are disabled for today.", 'Attendance Regularized');
      return;
    }

    this.attendanceStateService.clockIn((success) => {
      if (success) {
        this.getAllData();
      }
    });
  }

  onClockOut() {
    if (this.isViewingOtherEmployee) {
      this.toaster.warning('Clock in/out can only be performed by the employee directly.', 'Action Restricted');
      return;
    }
    if (this.isTodayRegularized) {
      this.toaster.warning("Today's attendance has been regularized. Clock-in and clock-out are disabled for today.", 'Attendance Regularized');
      return;
    }

    this.attendanceStateService.clockOut((success) => {
      if (success) {
        this.clockInTime = null;
        this.activeSessionDuration = '00h 00m 00s';
        this.getAllData();
      }
    });
  }

  dismissMissingPunchBanner() {
    this.isMissingPunchDismissed = true;
    this.missingPunchDay = null;
  }

  private extractTime24(val?: any): string {
    if (!val) return '09:30';
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [h, m] = s.split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
    const matchAmpm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (matchAmpm) {
      let h = parseInt(matchAmpm[1], 10);
      const m = matchAmpm[2];
      const isPm = matchAmpm[3].toUpperCase() === 'PM';
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${m}`;
    }
    const d = this.parseDateSafe(val);
    if (d && !isNaN(d.getTime())) {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
    return '09:30';
  }

  openRegularizationModal(row?: AttendanceRow | any, initialType: string = 'Regularization') {
    if (this.isViewingOtherEmployee) {
      this.toaster.info('Regularization requests can only be submitted by the employee directly. As a supervisor, review pending requests under Requests & Approvals.', 'Supervisor View');
      return;
    }
    if (row && row.isPriorToJoining) {
      this.toaster.info('Cannot regularize attendance for dates prior to your official joining date.', 'Prior to Joining');
      return;
    }

    const todayDateStr = this.toYMD(new Date());
    if (initialType === 'Regularization' && row?.dateStr && row.dateStr >= todayDateStr) {
      this.toaster.warning('Attendance regularization can only be requested for past completed workdays. Current day attendance must be recorded using Clock-In / Clock-Out.', 'Action Restricted');
      return;
    }

    if (row && row.isHoliday) {
      this.toaster.warning(`Cannot regularize attendance for ${row.formattedDate || row.dateStr} as it is a designated company holiday (${row.status || 'Holiday'}).`, 'Company Holiday');
      return;
    }

    if (row && row.isLeave) {
      this.toaster.warning(`Cannot regularize attendance for ${row.formattedDate || row.dateStr} as you have an active leave request for this date.`, 'On Leave');
      return;
    }

    if (row && !row.canRegularize) {
      const msg = row.regularizationStatus === 'Approved'
        ? 'Attendance for this date has already been regularized and approved.'
        : (row.regularizationStatus === 'Pending'
          ? 'A regularization request for this date is already pending approval.'
          : 'Attendance regularization cannot be requested for this date.');
      this.toaster.info(msg, 'Regularization Restricted');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const defaultRow = row || this.missingPunchDay || this.allRows.find(r => r.canRegularize && !r.isPriorToJoining && !r.isHoliday && !r.isLeave && r.dateStr < todayDateStr);
    const targetDateObj = defaultRow?.dateObj || yesterday;

    const hasExistingIn = !!(defaultRow && defaultRow.clockInDisplay && defaultRow.clockInDisplay !== '--');
    const existingInTime24 = hasExistingIn ? this.extractTime24(defaultRow?.clockIn || defaultRow?.clockInDisplay) : '09:30';
    const existingOutTime24 = (defaultRow && defaultRow.clockOutDisplay && defaultRow.clockOutDisplay !== '--')
      ? this.extractTime24(defaultRow.clockOut || defaultRow.clockOutDisplay)
      : '18:30';

    const dialogRef = this.dialog.open(AttendaseditComponent, {
      width: '560px',
      data: {
        employeeId: this.employeeId,
        date: defaultRow?.dateObj || defaultRow?.dateStr || targetDateObj,
        dateObj: defaultRow?.dateObj || targetDateObj,
        dateStr: defaultRow?.dateStr,
        Date: defaultRow?.formattedDate || 'Select Date',
        clockIn: existingInTime24,
        clockOut: existingOutTime24,
        hasExistingClockIn: hasExistingIn,
        existingClockInDisplay: defaultRow?.clockInDisplay || null,
        joiningDate: this.joiningDate,
        joiningDateStr: this.joiningDateStr,
        canRegularize: row ? row.canRegularize : true,
        regularizationStatus: row ? row.regularizationStatus : null,
        rejectionReason: row ? row.rejectionReason : '',
        requestType: initialType,
        existingRequests: this.allRequests,
        attendanceRecords: this.cachedRecords,
        leaves: this.cachedLeaves,
        holidays: this.cachedHolidays
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.missingPunchDay = null;
        this.getAllData();
      }
    });
  }

  onExportAttendance() {
    if (typeof window === 'undefined') return;

    const list = this.filteredRows.length > 0 ? this.filteredRows : this.allRows;
    const headers = ['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Break Time', 'Effective Hours', 'Gross Hours', 'Overtime'];

    const rows = list.map(r => [
      `"${r.dateStr}"`,
      `"${r.dayName}"`,
      `"${r.status}"`,
      `"${r.clockInDisplay}"`,
      `"${r.clockOutDisplay}"`,
      `"${r.breakTimeDisplay || '00h 00m'}"`,
      `"${r.effectiveHoursDisplay}"`,
      `"${r.totalHoursDisplay}"`,
      `"${r.overtimeDisplay}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employee_Attendance_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Attendance logs exported successfully!', 'Export Complete');
  }

  canCancelSelectedLeave(): boolean {
    if (!this.selectedDay || !this.selectedDay.isLeave || !this.selectedDay.leaveRecord) {
      return false;
    }

    const leave = this.selectedDay.leaveRecord;
    const status = (leave.status || 'Approved').toLowerCase().trim();
    if (status !== 'pending' && status !== 'approved') {
      return false;
    }

    // Approved leaves for past dates or days that have already passed cannot be cancelled
    if (status === 'approved') {
      const leaveDateStr = leave.startDate || this.selectedDay.dateStr || this.selectedDay.dateObj;
      if (leaveDateStr) {
        const leaveDate = new Date(leaveDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        leaveDate.setHours(0, 0, 0, 0);
        if (leaveDate.getTime() < today.getTime()) {
          return false;
        }
      }
    }

    const loggedUserId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    const leaveEmpId = Number(leave.employeeId || leave.empId || this.selectedEmployeeId || 0);

    return (loggedUserId > 0 && leaveEmpId === loggedUserId) || this.isHrOrAdmin;
  }

  cancelLeaveFromDrawer(leaveRecord: any) {
    if (!leaveRecord) {
      this.toaster.error('Leave details not found for this date.', 'Error');
      return;
    }

    if (!this.canCancelSelectedLeave()) {
      this.toaster.warning('Approved leaves for previous days or dates that have already passed cannot be cancelled.', 'Action Prohibited');
      return;
    }

    const leaveId = leaveRecord.id || leaveRecord.leaveRequestId || leaveRecord.leaveId;
    if (!leaveId) {
      this.toaster.error('Leave request identifier not found.', 'Error');
      return;
    }

    const typeName = leaveRecord.leaveTypeName || leaveRecord.leaveName || leaveRecord.type || 'Leave';

    const dialogRef = this.dialog.open(CancelLeaveModalComponent, {
      width: '480px',
      panelClass: 'custom-clean-dialog',
      data: {
        leaveId: Number(leaveId),
        leaveTypeName: typeName,
        startDate: leaveRecord.startDate,
        endDate: leaveRecord.endDate,
        reason: leaveRecord.leaveReason || leaveRecord.reason
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res && res.confirmed) {
        this.emailService.cancelLeave(Number(leaveId), res.reason || 'Cancelled by Employee from Attendance Calendar').subscribe({
          next: () => {
            this.toaster.success('Leave cancelled successfully. Quota has been restored.', 'Cancelled');
            this.closeDayDetail();
            this.getAllData();
          },
          error: (err: any) => {
            this.toaster.error(err?.error?.message || 'Failed to cancel leave request.', 'Error');
          }
        });
      }
    });
  }

  // =========================================================================
  // ATTENDANCE REGISTER MATRIX IMPLEMENTATION
  // =========================================================================

  switchToRegisterView(): void {
    if (!this.isHrOrAdmin) {
      this.toaster.warning('The Monthly Attendance Register is restricted to HR and Managers.', 'Access Denied');
      this.viewMode = 'calendar';
      return;
    }
    this.viewMode = 'register';
    if (this.allWorkforceEmployees.length === 0) {
      this.loadWorkforceForRegister();
    } else {
      this.buildAttendanceRegister();
    }
  }

  loadWorkforceForRegister(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res?.employeedata?.data && Array.isArray(res.employeedata.data)) list = res.employeedata.data;
        else if (res?.result && Array.isArray(res.result)) list = res.result;

        this.allWorkforceEmployees = list.filter((e: any) => !e.isDeleted);
        const depts = new Set<string>();
        this.allWorkforceEmployees.forEach((e: any) => {
          if (e.department) depts.add(e.department.trim());
          if (e.branch) depts.add(e.branch.trim());
        });
        this.registerDepartmentsList = Array.from(depts);
        this.buildAttendanceRegister();
      },
      error: () => {
        this.allWorkforceEmployees = [];
        this.buildAttendanceRegister();
      }
    });
  }

  prevRegisterMonth(): void {
    this.registerDate = new Date(this.registerDate.getFullYear(), this.registerDate.getMonth() - 1, 1);
    this.buildAttendanceRegister();
  }

  nextRegisterMonth(): void {
    this.registerDate = new Date(this.registerDate.getFullYear(), this.registerDate.getMonth() + 1, 1);
    this.buildAttendanceRegister();
  }

  todayRegisterMonth(): void {
    this.registerDate = new Date();
    this.buildAttendanceRegister();
  }

  getRegisterMonthLabel(): string {
    return this.registerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  buildAttendanceRegister(): void {
    const y = this.registerDate.getFullYear();
    const m = this.registerDate.getMonth();
    const totalDaysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const headers: { dayNumber: number; dayName: string; isWeekend: boolean }[] = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(y, m, day);
      const dOfWeek = d.getDay();
      headers.push({
        dayNumber: day,
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isWeekend: dOfWeek === 0 || dOfWeek === 6
      });
    }
    this.registerDaysHeaders = headers;

    const rows: RegisterEmployeeRow[] = [];
    const getEmpId = (item: any) => String(item.employeeId ?? item.EmployeeId ?? item.requestedBy ?? item.RequestedBy ?? item.employee?.id ?? item.Employee?.Id ?? '').trim();

    for (const emp of this.allWorkforceEmployees) {
      const empIdStr = String(emp.id || emp.employeeId).trim();
      const empRecords = this.cachedRecords.filter(r => getEmpId(r) === empIdStr);
      const empLogs = this.cachedLogs.filter(l => getEmpId(l) === empIdStr);
      const empRequests = this.cachedRequests.filter(r => getEmpId(r) === empIdStr);
      const empLeaves = this.cachedLeaves.filter(l => getEmpId(l) === empIdStr && (l.status === 'Approved' || l.status === 'approved'));

      let pCount = 0;
      let wfhCount = 0;
      let odCount = 0;
      let hdCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let woCount = 0;
      let absentCount = 0;

      const dayCells: RegisterDayCell[] = [];

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const d = new Date(y, m, day);
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = d.getDay();
        const isFuture = d > today;

        // 1. Holiday Check
        const isHoliday = this.cachedHolidays.some(h => {
          const hd = h.holidayDate || h.HolidayDate || h.date;
          return hd && this.toYMD(hd) === dateStr;
        });

        if (isHoliday) {
          holidayCount++;
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: 'H',
            label: 'Holiday',
            badgeClass: 'cell-badge-holiday'
          });
          continue;
        }

        // 2. Sunday or Weekly Off
        if (dayOfWeek === 0) {
          woCount++;
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: 'WO',
            label: 'Weekly Off',
            badgeClass: 'cell-badge-wo'
          });
          continue;
        }

        // 3. Approved Leave
        const matchedLeave = empLeaves.find(l => {
          const start = this.toYMD(l.startDate || l.StartDate);
          const end = this.toYMD(l.endDate || l.EndDate) || start;
          return dateStr >= start && dateStr <= end;
        });

        if (matchedLeave) {
          const lTypeName = String(matchedLeave.leaveTypeName || matchedLeave.type || '').toLowerCase();
          const isLop = lTypeName.includes('lop') || lTypeName.includes('unpaid') || lTypeName.includes('loss of pay');
          if (isLop) {
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'LOP',
              label: 'Loss of Pay',
              badgeClass: 'cell-badge-lop'
            });
          } else {
            leaveCount++;
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'L',
              label: 'Approved Leave',
              badgeClass: 'cell-badge-leave'
            });
          }
          continue;
        }

        // 4. Approved Attendance Request (WFH / OD / Regularized)
        const matchedReq = empRequests.find(r => {
          const reqD = this.toYMD(r.requestedDate || r.RequestedDate || r.attendanceDate);
          return reqD === dateStr && String(r.status || '').toLowerCase() === 'approved';
        });

        if (matchedReq) {
          const rType = String(matchedReq.requestType || '').toLowerCase();
          if (rType.includes('home') || rType.includes('wfh')) {
            wfhCount++;
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'WFH',
              label: 'Work From Home',
              badgeClass: 'cell-badge-wfh'
            });
            continue;
          } else if (rType.includes('duty') || rType.includes('od')) {
            odCount++;
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'OD',
              label: 'On-Duty',
              badgeClass: 'cell-badge-od'
            });
            continue;
          }
        }

        // 4b. Persistent Work Mode (WFH / OD) check
        const empWorkMode = this.workModelService.getWorkModelForDate(Number(empIdStr), dateStr);
        if (empWorkMode === 'WFH') {
          wfhCount++;
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: 'WFH',
            label: 'Work From Home',
            badgeClass: 'cell-badge-wfh'
          });
          continue;
        } else if (empWorkMode === 'OD') {
          odCount++;
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: 'OD',
            label: 'On-Duty',
            badgeClass: 'cell-badge-od'
          });
          continue;
        }

        // 5. Punch Checks
        const matchedAtt = empRecords.find(r => {
          const ad = this.toYMD(r.attendanceDate || r.AttendanceDate || r.clockIn);
          return ad === dateStr;
        });

        const matchedLog = empLogs.find(l => {
          const ld = this.toYMD(l.attendanceDate || l.AttendanceDate || l.inTime);
          return ld === dateStr;
        });

        if (matchedAtt || matchedLog) {
          const effHours = Number(matchedAtt?.effectiveHours || matchedAtt?.totalHours || matchedLog?.duration || 8.5);
          if (effHours >= 4.5) {
            pCount++;
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'P',
              label: 'Present',
              badgeClass: 'cell-badge-present'
            });
          } else {
            hdCount++;
            dayCells.push({
              dayNumber: day,
              dateStr,
              dayName: headers[day - 1].dayName,
              code: 'HD',
              label: 'Half Day',
              badgeClass: 'cell-badge-halfday'
            });
          }
          continue;
        }

        // 6. Future or Absent
        if (isFuture) {
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: '-',
            label: 'Upcoming',
            badgeClass: 'cell-badge-future'
          });
        } else {
          absentCount++;
          dayCells.push({
            dayNumber: day,
            dateStr,
            dayName: headers[day - 1].dayName,
            code: 'A',
            label: 'Absent',
            badgeClass: 'cell-badge-absent'
          });
        }
      }

      const payableDays = pCount + wfhCount + odCount + (hdCount * 0.5) + leaveCount + holidayCount + woCount;

      rows.push({
        employeeId: Number(emp.id),
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee #${emp.id}`,
        employeeCode: `EMP-${emp.id}`,
        department: emp.department || emp.branch || 'General',
        designation: emp.designation || 'Team Member',
        days: dayCells,
        presentCount: pCount,
        wfhCount: wfhCount,
        onDutyCount: odCount,
        halfDayCount: hdCount,
        leaveCount: leaveCount,
        holidayCount: holidayCount,
        weeklyOffCount: woCount,
        absentCount: absentCount,
        payableDays: Number(payableDays.toFixed(1))
      });
    }

    this.registerRows = rows;
    this.filterRegister();
  }

  filterRegister(): void {
    let list = [...this.registerRows];
    if (this.registerDepartment !== 'All') {
      list = list.filter(r => r.department.toLowerCase() === this.registerDepartment.toLowerCase());
    }
    if (this.registerSearch && this.registerSearch.trim()) {
      const q = this.registerSearch.toLowerCase().trim();
      list = list.filter(r =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q)
      );
    }
    this.filteredRegisterRows = list;
  }

  exportRegisterCSV(): void {
    if (typeof window === 'undefined') return;
    const y = this.registerDate.getFullYear();
    const m = this.registerDate.toLocaleString('en-US', { month: 'short' });

    const dayHeaders = this.registerDaysHeaders.map(h => `"D${h.dayNumber}"`).join(',');
    const headers = `"Employee Code","Employee Name","Department","Designation",${dayHeaders},"Present","WFH","On-Duty","Half-Day","Leaves","Holidays","Weekly Offs","Absent","Payable Days"`;

    const rows = this.filteredRegisterRows.map(r => {
      const dayValues = r.days.map(d => `"${d.code}"`).join(',');
      return `"${r.employeeCode}","${r.employeeName}","${r.department}","${r.designation}",${dayValues},${r.presentCount},${r.wfhCount},${r.onDutyCount},${r.halfDayCount},${r.leaveCount},${r.holidayCount},${r.weeklyOffCount},${r.absentCount},${r.payableDays}`;
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Register_Matrix_${m}_${y}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Monthly attendance register exported successfully!', 'Export Complete');
  }

  // --- Work Model & Shift Swap Integration ---
  loadWorkModelState(): void {
    const empId = this.effectiveTargetEmployeeId;
    const todayStr = this.workModelService.formatDate(new Date());

    // 1. Initial immediate sync from memory/storage
    this.todayWorkMode = this.workModelService.getWorkModelForDate(empId, todayStr);
    this.weeklyHybridProgress = this.workModelService.getWeeklyHybridProgress(empId, this.calendarDate);

    // 2. Fetch fresh record from backend database
    this.workModelService.fetchForDate(empId, todayStr).subscribe(mode => {
      this.todayWorkMode = mode;
      this.weeklyHybridProgress = this.workModelService.getWeeklyHybridProgress(empId, this.calendarDate);
    });

    // 3. Fetch current month's range from backend database
    const dStart = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth(), 1);
    const dEnd = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 0);
    this.workModelService.fetchRange(
      empId,
      this.workModelService.formatDate(dStart),
      this.workModelService.formatDate(dEnd)
    ).subscribe();
  }

  selectWorkMode(mode: WorkModelType): void {
    const empId = this.effectiveTargetEmployeeId;
    const isOther = this.isViewingOtherEmployee;
    const canDirect = this.workModelService.canEmployeeDirectSelect();

    if (isOther || canDirect || mode === 'WFO') {
      const selectedBy = isOther ? (this.isHrOrAdmin ? 'Admin' : 'Manager') : 'Employee';
      this.workModelService.setTodayWorkModel(empId, mode, selectedBy);
      this.todayWorkMode = mode;
      this.loadWorkModelState();
      const label = mode === 'WFO' ? 'Office' : mode === 'WFH' ? 'Work From Home' : 'On-Duty';
      const targetMsg = isOther
        ? `Work mode for ${this.selectedEmployeeName || 'employee'} recorded as ${label}.`
        : `Your work mode for today is recorded as ${label}.`;
      this.toaster.success(targetMsg, 'Work Mode Updated');
    } else {
      const typeStr = mode === 'WFH' ? 'Work From Home' : 'On-Duty';
      this.toaster.info(`Your project requires approval for ${typeStr}. Opening request form.`, 'Approval Policy');
      this.openRegularizationModal(null, typeStr);
    }
  }

  openShiftSwapModal(): void {
    const empId = Number(this.loggedInEmployeeId || this.employeeId || 1);
    const dialogRef = this.dialog.open(ShiftSwapModalComponent, {
      width: '620px',
      data: {
        currentEmployeeId: empId,
        isSelfService: true
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.toaster.info('Shift swap request submitted. You will be notified upon manager review.', 'Swap Proposed');
      }
    });
  }
}
