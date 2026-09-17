import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

export interface AttendanceRow {
  dateObj: Date;
  dateStr: string;
  dayName: string;
  formattedDate: string;
  isWeekend: boolean;
  isHoliday?: boolean;
  isLeave?: boolean;
  status: string;
  clockIn?: string;
  clockOut?: string;
  clockInDisplay?: string;
  clockOutDisplay?: string;
  totalHoursDecimal?: number;
  effectiveHoursDecimal?: number;
  totalHoursDisplay?: string;
  effectiveHoursDisplay?: string;
  overtimeDisplay?: string;
  isOvertime?: boolean;
  rawItem?: any;

  // Regularization details
  isRegularized: boolean;
  regularizationStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
  rejectionReason?: string;
  canRegularize: boolean;
  punchType: 'Self Punch' | 'Regularized' | 'None';
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
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  Math = Math;

  // Component state
  employeeId: string = '1';
  isClockedIn: boolean = false;
  clockInTime: Date | null = null;
  activeSessionDuration: string = '00h 00m 00s';

  // Real-time Clock
  currentTimeDisplay: string = '';
  currentDateDisplay: string = '';
  private timerInterval: any;
  private sessionInterval: any;

  // Attendance Records
  allRows: AttendanceRow[] = [];
  filteredRows: AttendanceRow[] = [];
  paginatedRows: AttendanceRow[] = [];

  // Filter state
  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedMonth: string = 'Current';

  // Metrics
  avgWorkingHours: string = '08:15';
  avgInTime: string = '09:48 AM';
  avgOutTime: string = '07:15 PM';
  presentDaysCount: number = 22;
  totalWorkingDays: number = 24;
  complianceRate: number = 92;

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.initClock();
      if (typeof localStorage !== 'undefined') {
        const storedId = localStorage.getItem('employeeId');
        if (storedId) {
          this.employeeId = storedId;
        }

        // Instant local restoration so UI is immediately in Clock-Out state if previously active
        const savedClockIn = localStorage.getItem(`activeClockIn_${this.employeeId}`);
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
              localStorage.removeItem(`activeClockIn_${this.employeeId}`);
            }
          }
        }
      }
      this.getAllData();
    } else {
      this.currentTimeDisplay = '09:00:00 AM';
      this.currentDateDisplay = 'Monday, 12 August 2026';
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.sessionInterval) clearInterval(this.sessionInterval);
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
      logs: this.services.getAttendanceLogs().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ attendance, requests, leaves, holidays, logs }: any) => {
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

        const getEmpId = (item: any) => String(item.employeeId ?? item.EmployeeId ?? item.requestedBy ?? item.RequestedBy ?? '');
        const currentId = String(this.employeeId || '').trim();

        let employeeRecords: any[] = [];
        if (currentId) {
          employeeRecords = rawAttendance.filter((item: any) => getEmpId(item) === currentId);
        } else {
          employeeRecords = rawAttendance;
        }

        let employeeRequests = rawRequests;
        if (currentId) {
          const matched = rawRequests.filter((item: any) => getEmpId(item) === currentId);
          employeeRequests = matched;
        }

        let employeeLeaves = rawLeaves;
        if (currentId) {
          const matched = rawLeaves.filter((item: any) => {
            const eid = getEmpId(item);
            return !eid || eid === currentId;
          });
          if (matched.length > 0) {
            employeeLeaves = matched;
          }
        }

        let employeeLogs: any[] = [];
        if (currentId) {
          employeeLogs = rawLogs.filter((item: any) => getEmpId(item) === currentId);
        } else {
          employeeLogs = rawLogs;
        }

        // Active Clock-In Session Resolution (Logs -> Attendance -> LocalStorage)
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

        const todayLogs = employeeLogs.filter((l: any) => {
          const d = l.attendanceDate || l.AttendanceDate;
          return d && this.toYMD(d) === todayDateStr;
        });

        // 1. Check if there is an active session in AttendanceLog (inTime present, outTime null/invalid)
        const activeLog = todayLogs.find((l: any) => {
          const inT = l.inTime || l.InTime;
          const outT = l.outTime || l.OutTime;
          return this.isRealTime(inT) && !this.isRealTime(outT);
        });

        // 2. Check today's EmployeeAttendance record
        const todayAttendance = employeeRecords.find((r: any) => {
          const ad = r.attendanceDate || r.AttendanceDate;
          return ad && this.toYMD(ad) === todayDateStr;
        });

        if (activeLog) {
          this.isClockedIn = true;
          this.clockInTime = this.parseDateSafe(activeLog.inTime || activeLog.InTime);
          if (typeof localStorage !== 'undefined' && this.clockInTime) {
            localStorage.setItem(`activeClockIn_${this.employeeId}`, this.clockInTime.toISOString());
          }
        } else if (todayLogs.length > 0 && todayAttendance && this.isRealTime(todayAttendance.clockIn || todayAttendance.ClockIn) && !this.isRealTime(todayAttendance.clockOut || todayAttendance.ClockOut)) {
          this.isClockedIn = true;
          this.clockInTime = this.parseDateSafe(todayAttendance.clockIn || todayAttendance.ClockIn);
          if (typeof localStorage !== 'undefined' && this.clockInTime) {
            localStorage.setItem(`activeClockIn_${this.employeeId}`, this.clockInTime.toISOString());
          }
        } else {
          // If no active session in AttendanceLog (or todayLogs is empty), reset state
          this.isClockedIn = false;
          this.clockInTime = null;
          this.activeSessionDuration = '00h 00m 00s';
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`activeClockIn_${this.employeeId}`);
          }
        }

        this.generateLast30DaysRows(employeeRecords, employeeRequests, employeeLeaves, rawHolidays, employeeLogs);
      },
      error: () => {
        this.generateLast30DaysRows([], [], [], [], []);
      }
    });
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
      const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = dayNames[d.getDay()];

      const yyyy = d.getFullYear();
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
      const formattedDate = `${d.toLocaleDateString('en-GB', options)}, ${dayName}`;

      // Check Holiday
      const holidayMatch = holidays.find((h: any) => {
        if (h.isActive === false || h.isActive === 0 || h.isDeleted) return false;
        const hd = h.holidayDate || h.HolidayDate;
        if (!hd) return false;
        return this.toYMD(hd) === dateStr;
      });

      // Check Approved Leave
      const leaveMatch = leaves.find((l: any) => {
        const st = String(l.status || l.Status || '').toLowerCase().trim();
        if (st !== 'approved') return false;
        if (l.isDeleted === 1 || l.isDeleted === true) return false;
        const start = this.toYMD(l.startDate || l.StartDate || l.fromDate || l.FromDate);
        const end = this.toYMD(l.endDate || l.EndDate || l.toDate || l.ToDate) || start;
        if (!start) return false;
        return dateStr >= start && dateStr <= end;
      });

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

      // Prioritize active (Pending or Approved) requests over Rejected ones
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
          canRegularize = false; // Cannot re-apply if already approved
        } else if (s === 'pending') {
          regularizationStatus = 'Pending';
          canRegularize = false; // Cannot re-apply if pending
        } else if (s === 'rejected') {
          regularizationStatus = 'Rejected';
          canRegularize = !isWeekend && !holidayMatch && !leaveMatch; // CAN re-apply if rejected!
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

      const isToday = i === 0;

      // Extract punch timings across logs
      const validInTimes: number[] = [];
      const validOutTimes: number[] = [];
      const allInStrs: (string | null | undefined)[] = [];
      const allOutStrs: (string | null | undefined)[] = [];

      // If today has no logs in AttendanceLog, do NOT read from orphaned EmployeeAttendance table
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

      if (isWeekend) {
        status = 'Week Off';
        canRegularize = false;
      } else if (holidayMatch) {
        status = holidayMatch.holidayName || holidayMatch.HolidayName || 'Holiday';
        isHoliday = true;
        canRegularize = false;
      } else if (leaveMatch) {
        const leaveTypeName = leaveMatch.leaveTypeName || leaveMatch.LeaveTypeName || leaveMatch.leaveName || leaveMatch.type || 'On Leave';
        status = leaveTypeName;
        isLeave = true;
        canRegularize = false;
        workingDaysCount++;
      } else if (isRegularized) {
        status = 'Present';
        canRegularize = false;
        workingDaysCount++;
        presentCount++;

        const reqIn = reqMatch.checkIn || reqMatch.CheckIn || reqMatch.clockIn || reqMatch.ClockIn;
        const reqOut = reqMatch.checkOut || reqMatch.CheckOut || reqMatch.clockOut || reqMatch.ClockOut;
        clockInDisplay = reqIn ? this.formatTimeDisplay(reqIn) : '09:30 AM';
        clockOutDisplay = reqOut ? this.formatTimeDisplay(reqOut) : '06:30 PM';
        totalHrsDec = 9.0;
        totalHrsSum += totalHrsDec;
        totalHrsDisplay = '09h 00m';
        effectiveHrsDisplay = '08h 00m';
      } else if (rawEarliestIn || hasPunchToday) {
        status = 'Present';
        workingDaysCount++;
        presentCount++;
        canRegularize = false;

        clockIn = rawEarliestIn || (this.clockInTime ? this.clockInTime.toISOString() : '');
        clockInDisplay = this.formatTimeDisplay(clockIn);

        if (hasActiveSession) {
          clockOutDisplay = '--';
          const completedLogsDuration = dayLogs.filter((l: any) => this.isRealTime(l.outTime || l.OutTime)).reduce((sum: number, l: any) => sum + (Number(l.duration) || 0), 0);
          const currentDuration = this.clockInTime ? Math.max(0, (today.getTime() - this.clockInTime.getTime()) / 3600000) : 0;
          totalHrsDec = Number((completedLogsDuration + currentDuration).toFixed(2));
          totalHrsDisplay = this.formatHoursToHm(totalHrsDec);
          effectiveHrsDisplay = this.formatHoursToHm(totalHrsDec);
        } else {
          clockOut = rawLatestOut || '';
          clockOutDisplay = this.formatTimeDisplay(clockOut);
          const completedLogsDuration = dayLogs.reduce((sum: number, l: any) => sum + (Number(l.duration) || 0), 0);
          totalHrsDec = match?.totalHours ? Number(match.totalHours) : (completedLogsDuration || 8.5);
          const effHrsDec = match?.effectiveHours ? Number(match.effectiveHours) : (completedLogsDuration || Math.max(0, totalHrsDec - 1));
          totalHrsDisplay = this.formatHoursToHm(totalHrsDec);
          effectiveHrsDisplay = this.formatHoursToHm(effHrsDec);
        }

        if (totalHrsDec > 8.0) {
          overtimeDisplay = `+${this.formatHoursToHm(totalHrsDec - 8.0)}`;
          isOvertime = true;
        }

        totalHrsSum += totalHrsDec;
      } else {
        // Not weekend, not holiday, not on leave, no punch, not regularized => Absent
        status = 'Absent';
        workingDaysCount++;
        canRegularize = regularizationStatus !== 'Pending' && regularizationStatus !== 'Approved';
      }

      let punchType: 'Self Punch' | 'Regularized' | 'None' = 'None';
      if (isRegularized) {
        punchType = 'Regularized';
      } else if ((rawEarliestIn || hasPunchToday) && !isWeekend) {
        punchType = 'Self Punch';
      }

      rows.push({
        dateObj: d,
        dateStr,
        dayName,
        formattedDate,
        isWeekend,
        isHoliday,
        isLeave,
        status,
        clockIn,
        clockOut,
        clockInDisplay,
        clockOutDisplay,
        totalHoursDecimal: totalHrsDec,
        effectiveHoursDecimal: Math.max(0, totalHrsDec - 1),
        totalHoursDisplay: totalHrsDisplay,
        effectiveHoursDisplay: effectiveHrsDisplay,
        overtimeDisplay,
        isOvertime,
        isRegularized,
        regularizationStatus,
        rejectionReason,
        canRegularize,
        punchType,
        rawItem: match || { Date: formattedDate, clockIn, clockOut }
      });
    }

    this.allRows = rows;
    this.presentDaysCount = presentCount;
    this.totalWorkingDays = Math.max(1, workingDaysCount);
    this.complianceRate = Math.min(100, Math.round((presentCount / this.totalWorkingDays) * 100));

    const avgDec = presentCount > 0 ? (totalHrsSum / presentCount) : 0;
    this.avgWorkingHours = avgDec > 0 ? this.formatHoursToHm(avgDec) : '00h 00m';

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
    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '420px',
      data: {
        title: 'Confirm Punch In',
        message: `Are you ready to record your Clock-In for today (${this.currentDateDisplay})?`
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res === 'confirm') {
        this.startClock();
      }
    });
  }

  openClockOutDialog() {
    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '420px',
      data: {
        title: 'Confirm Punch Out',
        message: 'Are you sure you want to end your working session and Clock-Out?'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res === 'confirm') {
        this.onClockOut();
      }
    });
  }

  startClock() {
    const now = new Date();
    this.isClockedIn = true;
    this.clockInTime = now;

    const nowIso = now.toISOString();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`activeClockIn_${this.employeeId}`, nowIso);
    }

    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    this.services.createData(
      Number(this.employeeId),
      nowIso,
      null,
      0,
      0,
      'Present',
      nowIso,
      todayStr
    ).subscribe({
      next: () => {
        this.toaster.success(`Clocked In at ${this.currentTimeDisplay}`, 'Session Active');
        this.getAllData();
      },
      error: (err) => {
        console.error(err);
        this.toaster.error('Failed to record Clock-In', 'Error');
      }
    });
  }

  onClockOut() {
    const now = new Date();
    this.isClockedIn = false;
    const inTime = this.clockInTime ? this.clockInTime : now;
    const diffMs = Math.max(0, now.getTime() - inTime.getTime());
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    const effectiveHours = totalHours;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`activeClockIn_${this.employeeId}`);
    }

    const nowIso = now.toISOString();
    const inIso = inTime.toISOString();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    this.services.createData(
      Number(this.employeeId),
      inIso,
      nowIso,
      totalHours,
      effectiveHours,
      'Present',
      nowIso,
      todayStr
    ).subscribe({
      next: () => {
        this.toaster.info(`Clocked Out at ${this.currentTimeDisplay}`, 'Session Ended');
        this.clockInTime = null;
        this.activeSessionDuration = '00h 00m 00s';
        this.getAllData();
      },
      error: (err) => {
        console.error(err);
        this.toaster.error('Failed to record Clock-Out', 'Error');
      }
    });
  }

  openRegularizationModal(row?: AttendanceRow) {
    const targetRow = row || (this.allRows.length > 0 ? this.allRows[0] : undefined);

    if (targetRow && !targetRow.canRegularize) {
      const msg = targetRow.regularizationStatus === 'Approved'
        ? 'Attendance for this date has already been regularized and approved.'
        : 'A regularization request for this date is already pending approval.';
      this.toaster.info(msg, 'Regularization Active');
      return;
    }

    const dialogRef = this.dialog.open(AttendaseditComponent, {
      width: '560px',
      data: targetRow ? {
        employeeId: this.employeeId,
        date: targetRow.dateObj || targetRow.dateStr || targetRow.formattedDate,
        dateObj: targetRow.dateObj,
        dateStr: targetRow.dateStr,
        Date: targetRow.formattedDate,
        clockIn: targetRow.clockInDisplay !== '--' ? '09:30' : '09:00',
        clockOut: targetRow.clockOutDisplay !== '--' ? '18:30' : '18:00',
        canRegularize: targetRow.canRegularize,
        regularizationStatus: targetRow.regularizationStatus,
        rejectionReason: targetRow.rejectionReason,
        existingRequests: this.allRequests
      } : {
        employeeId: this.employeeId,
        date: new Date(),
        dateObj: new Date(),
        Date: 'Today',
        clockIn: '09:30',
        clockOut: '18:30',
        canRegularize: true,
        existingRequests: this.allRequests
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllData();
      }
    });
  }

  onExportAttendance() {
    if (typeof window === 'undefined') return;

    const list = this.filteredRows.length > 0 ? this.filteredRows : this.allRows;
    const headers = ['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Total Hours', 'Effective Hours', 'Overtime'];

    const rows = list.map(r => [
      `"${r.dateStr}"`,
      `"${r.dayName}"`,
      `"${r.status}"`,
      `"${r.clockInDisplay}"`,
      `"${r.clockOutDisplay}"`,
      `"${r.totalHoursDisplay}"`,
      `"${r.effectiveHoursDisplay}"`,
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
}
