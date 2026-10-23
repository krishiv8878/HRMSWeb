import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, forkJoin, of, catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EmployeeeService } from './employeee.service';
import { AttendanceRequestService } from '../attenRequest/attendance-request.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceStateService implements OnDestroy {
  private attendanceService = inject(EmployeeeService);
  private attendanceRequestService = inject(AttendanceRequestService);
  private toaster = inject(ToastrService);

  private isClockedInSubject = new BehaviorSubject<boolean>(false);
  public isClockedIn$: Observable<boolean> = this.isClockedInSubject.asObservable();

  private clockInTimeSubject = new BehaviorSubject<Date | null>(null);
  public clockInTime$: Observable<Date | null> = this.clockInTimeSubject.asObservable();

  private clockOutTimeSubject = new BehaviorSubject<Date | null>(null);
  public clockOutTime$: Observable<Date | null> = this.clockOutTimeSubject.asObservable();

  private hasClockedOutTodaySubject = new BehaviorSubject<boolean>(false);
  public hasClockedOutToday$: Observable<boolean> = this.hasClockedOutTodaySubject.asObservable();

  private todayTotalHoursSubject = new BehaviorSubject<string>('00h 00m 00s');
  public todayTotalHours$: Observable<string> = this.todayTotalHoursSubject.asObservable();

  private sessionElapsedSubject = new BehaviorSubject<string>('00h 00m 00s');
  public sessionElapsed$: Observable<string> = this.sessionElapsedSubject.asObservable();

  private currentTimeSubject = new BehaviorSubject<string>('');
  public currentTime$: Observable<string> = this.currentTimeSubject.asObservable();

  private isTodayRegularizedSubject = new BehaviorSubject<boolean>(false);
  public isTodayRegularized$: Observable<boolean> = this.isTodayRegularizedSubject.asObservable();

  private regularizedStatusLabelSubject = new BehaviorSubject<string>('');
  public regularizedStatusLabel$: Observable<string> = this.regularizedStatusLabelSubject.asObservable();

  // Event emitter for components to know a punch occurred
  public punchChanged$ = new Subject<{ type: 'clockIn' | 'clockOut'; time: Date }>();

  private timerInterval: any = null;
  private isProcessingPunch: boolean = false;
  private loggedInEmployeeId: string = '';

  constructor() {
    this.init();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  public get isClockedIn(): boolean {
    return this.isClockedInSubject.value;
  }

  public get hasClockedOutToday(): boolean {
    return this.hasClockedOutTodaySubject.value;
  }

  public get clockInTime(): Date | null {
    return this.clockInTimeSubject.value;
  }

  public get clockOutTime(): Date | null {
    return this.clockOutTimeSubject.value;
  }

  public get todayTotalHours(): string {
    return this.todayTotalHoursSubject.value;
  }

  public get currentElapsedDisplay(): string {
    return this.sessionElapsedSubject.value;
  }

  public get isTodayRegularized(): boolean {
    return this.isTodayRegularizedSubject.value;
  }

  public get regularizedStatusLabel(): string {
    return this.regularizedStatusLabelSubject.value;
  }

  public get employeeId(): string {
    if (!this.loggedInEmployeeId && typeof localStorage !== 'undefined') {
      this.loggedInEmployeeId = localStorage.getItem('employeeId') || '';
    }
    return this.loggedInEmployeeId;
  }

  public init() {
    if (typeof window === 'undefined') return;

    this.loggedInEmployeeId = typeof localStorage !== 'undefined' ? (localStorage.getItem('employeeId') || '') : '';

    // 1. Instant local restoration so UI is immediately active without waiting for API
    if (this.loggedInEmployeeId) {
      const todayStr = this.toYMD(new Date());
      const savedClockIn = localStorage.getItem(`activeClockIn_${this.loggedInEmployeeId}`);
      if (savedClockIn) {
        const d = this.parseDateSafe(savedClockIn);
        if (d) {
          const savedStr = this.toYMD(d);
          if (savedStr === todayStr) {
            this.setClockedInState(true, d);
          } else {
            localStorage.removeItem(`activeClockIn_${this.loggedInEmployeeId}`);
          }
        }
      }

      // Check saved completed shift for today
      const savedCompleted = localStorage.getItem(`completedShift_${this.loggedInEmployeeId}`);
      if (savedCompleted && !this.isClockedInSubject.value) {
        try {
          const parsed = JSON.parse(savedCompleted);
          if (parsed && parsed.date === todayStr) {
            const inT = this.parseDateSafe(parsed.inTime);
            const outT = this.parseDateSafe(parsed.outTime);
            this.setClockedOutState(inT, outT, parsed.duration || '00h 00m 00s');
          } else {
            localStorage.removeItem(`completedShift_${this.loggedInEmployeeId}`);
          }
        } catch {}
      }
    }

    // 2. Start live second timer
    this.updateClock();
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => this.updateClock(), 1000);
    }

    // 3. Verify with backend API
    this.checkActiveSessionFromBackend();
  }

  /**
   * Called after a new user logs in (same browser tab). Resets all in-memory state
   * so the new user's clock state loads fresh instead of showing the previous user's session.
   */
  public reinit(): void {
    // Reset all subjects to clean defaults
    this.isClockedInSubject.next(false);
    this.clockInTimeSubject.next(null);
    this.clockOutTimeSubject.next(null);
    this.hasClockedOutTodaySubject.next(false);
    this.todayTotalHoursSubject.next('00h 00m 00s');
    this.sessionElapsedSubject.next('00h 00m 00s');

    // Clear cached employee id so init() re-reads from localStorage
    this.loggedInEmployeeId = '';
    this.isProcessingPunch = false;

    // Re-initialize with new user context
    this.init();
  }

  public checkActiveSessionFromBackend() {
    const empId = this.employeeId;
    if (!empId) return;

    forkJoin({
      attendance: this.attendanceService.getByEmployeeId(empId).pipe(catchError(() => of([]))),
      logs: this.attendanceService.getAttendanceLogsByEmployeeId(empId).pipe(catchError(() => of([]))),
      requests: this.attendanceRequestService.getAllData().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res: any) => {
        const rawAttendance = Array.isArray(res?.attendance?.data)
          ? res.attendance.data
          : (res?.attendance?.data ? [res.attendance.data] : (Array.isArray(res?.attendance) ? res.attendance : (res?.attendance ? [res.attendance] : [])));
        const rawLogs = Array.isArray(res?.logs?.data)
          ? res.logs.data
          : (res?.logs?.data ? [res.logs.data] : (Array.isArray(res?.logs) ? res.logs : (res?.logs ? [res.logs] : [])));
        const rawRequests = Array.isArray(res?.requests?.data) ? res.requests.data : (Array.isArray(res?.requests) ? res.requests : []);

        const now = new Date();
        const todayDateStr = this.toYMD(now);

        const getEmpId = (item: any) => String(item.employeeId ?? item.EmployeeId ?? item.requestedBy ?? item.RequestedBy ?? '');
        const loggedInId = String(empId).trim();

        // 1. Check if today has an Approved or Pending regularization request (strictly RequestType == 'Regularization')
        const todayReq = rawRequests.find((r: any) => {
          const reqEmpId = getEmpId(r);
          const rawDate = r.requestedDate || r.RequestedDate || r.attendanceDate || r.AttendanceDate;
          const reqDateStr = rawDate ? this.toYMD(new Date(rawDate)) : '';
          const st = String(r.status || r.Status || '').toLowerCase().trim();
          const type = String(r.requestType || r.RequestType || '').toLowerCase().trim();
          const isRegularization = type === 'regularization' || type.includes('regular');
          return reqEmpId === loggedInId && reqDateStr === todayDateStr && isRegularization && (st === 'approved' || st === 'pending');
        });

        if (todayReq) {
          const st = String(todayReq.status || todayReq.Status || '').toLowerCase().trim();
          const isApproved = st === 'approved';
          this.isTodayRegularizedSubject.next(true);
          this.regularizedStatusLabelSubject.next(isApproved ? 'Regularized' : 'Reg. Pending');
          
          const inT = this.parseDateSafe(todayReq.clockIn || todayReq.ClockIn);
          const outT = this.parseDateSafe(todayReq.clockOut || todayReq.ClockOut);
          this.setClockedOutState(inT, outT, '08h 30m 00s');
          return;
        }

        this.isTodayRegularizedSubject.next(false);
        this.regularizedStatusLabelSubject.next('');

        const todayLoggedInLogs = rawLogs.filter((l: any) => {
          const d = l.attendanceDate || l.AttendanceDate;
          return getEmpId(l) === loggedInId && d && this.toYMD(d) === todayDateStr;
        });

        // Check if there is an open session in AttendanceLog
        const activeLog = todayLoggedInLogs.find((l: any) => {
          const inT = l.inTime || l.InTime;
          const outT = l.outTime || l.OutTime;
          return this.isRealTime(inT) && !this.isRealTime(outT);
        });

        // Check today's EmployeeAttendance record
        const todayAttendance = rawAttendance.find((r: any) => {
          const ad = r.attendanceDate || r.AttendanceDate;
          return getEmpId(r) === loggedInId && ad && this.toYMD(ad) === todayDateStr;
        });

        const hasOpenAttendance = todayAttendance && this.isRealTime(todayAttendance.clockIn || todayAttendance.ClockIn) && !this.isRealTime(todayAttendance.clockOut || todayAttendance.ClockOut);

        if (activeLog) {
          const inTime = this.parseDateSafe(activeLog.inTime || activeLog.InTime);
          this.setClockedInState(true, inTime);
        } else if (hasOpenAttendance) {
          const inTime = this.parseDateSafe(todayAttendance.clockIn || todayAttendance.ClockIn);
          this.setClockedInState(true, inTime);
        } else {
          // If no active session found on backend, check if user clocked out today
          const hasClosedAttendance = todayAttendance && this.isRealTime(todayAttendance.clockOut || todayAttendance.ClockOut);
          const hasAnyLogs = todayLoggedInLogs.length > 0;
          if (hasClosedAttendance || (!todayAttendance && hasAnyLogs)) {
            const firstInTime = this.parseDateSafe(todayAttendance?.clockIn || todayAttendance?.ClockIn) || (todayLoggedInLogs.length > 0 ? this.parseDateSafe(todayLoggedInLogs[0].inTime || todayLoggedInLogs[0].InTime) : null);
            const lastOutTime = this.parseDateSafe(todayAttendance?.clockOut || todayAttendance?.ClockOut) || (todayLoggedInLogs.length > 0 ? this.parseDateSafe(todayLoggedInLogs[todayLoggedInLogs.length - 1].outTime || todayLoggedInLogs[todayLoggedInLogs.length - 1].OutTime) : null);

            let totalHoursDecimal = Number(todayAttendance?.totalHours ?? todayAttendance?.TotalHours ?? todayAttendance?.effectiveHours ?? todayAttendance?.EffectiveHours ?? 0);
            if (totalHoursDecimal <= 0 && firstInTime && lastOutTime) {
              const diffMs = Math.max(0, lastOutTime.getTime() - firstInTime.getTime());
              totalHoursDecimal = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }

            const durationStr = this.formatDurationFromHours(totalHoursDecimal, firstInTime, lastOutTime);
            this.setClockedOutState(firstInTime, lastOutTime, durationStr);
          } else {
            this.setClockedInState(false, null);
          }
        }
      }
    });
  }

  public setClockedInState(isClocked: boolean, inTime: Date | null) {
    this.isClockedInSubject.next(isClocked);
    this.clockInTimeSubject.next(inTime);

    if (isClocked) {
      this.hasClockedOutTodaySubject.next(false);
      this.clockOutTimeSubject.next(null);
      if (inTime && typeof localStorage !== 'undefined' && this.employeeId) {
        localStorage.setItem(`activeClockIn_${this.employeeId}`, inTime.toISOString());
        localStorage.removeItem(`completedShift_${this.employeeId}`);
      }
    } else {
      if (typeof localStorage !== 'undefined' && this.employeeId) {
        localStorage.removeItem(`activeClockIn_${this.employeeId}`);
      }
    }
  }

  public setClockedOutState(inTime: Date | null, outTime: Date | null, durationDisplay: string) {
    this.isClockedInSubject.next(false);
    this.hasClockedOutTodaySubject.next(true);
    this.clockInTimeSubject.next(inTime);
    this.clockOutTimeSubject.next(outTime);
    this.todayTotalHoursSubject.next(durationDisplay || '00h 00m 00s');

    if (typeof localStorage !== 'undefined' && this.employeeId) {
      localStorage.removeItem(`activeClockIn_${this.employeeId}`);
      localStorage.setItem(`completedShift_${this.employeeId}`, JSON.stringify({
        date: this.toYMD(new Date()),
        inTime: inTime ? inTime.toISOString() : null,
        outTime: outTime ? outTime.toISOString() : null,
        duration: durationDisplay
      }));
    }
  }

  public formatDurationFromHours(hrsDecimal: number, inTime?: Date | null, outTime?: Date | null): string {
    if (inTime && outTime) {
      const diffMs = Math.max(0, outTime.getTime() - inTime.getTime());
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    if (hrsDecimal > 0) {
      const totalSec = Math.round(hrsDecimal * 3600);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return '00h 00m 00s';
  }

  public clockIn(callback?: (success: boolean, errorMsg?: string) => void) {
    if (this.isTodayRegularized) {
      const msg = "Today's attendance has been regularized. Punching (Clock-In / Clock-Out) is disabled for today.";
      this.toaster.warning(msg, 'Attendance Regularized');
      if (callback) callback(false, msg);
      return;
    }
    if (this.isProcessingPunch) {
      if (callback) callback(false, 'A punch action is already in progress.');
      return;
    }
    const empId = Number(this.employeeId);
    if (!empId) {
      const msg = 'Unable to identify logged-in employee session.';
      this.toaster.error(msg, 'Session Error');
      if (callback) callback(false, msg);
      return;
    }

    this.isProcessingPunch = true;
    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = this.toYMD(now);

    this.attendanceService.createData(
      empId,
      nowIso,
      null,
      0,
      0,
      'Present',
      nowIso,
      todayStr
    ).subscribe({
      next: () => {
        this.isProcessingPunch = false;
        this.setClockedInState(true, now);
        this.toaster.success(`Clocked In at ${this.formatTime12(now)}`, 'Session Active');
        this.punchChanged$.next({ type: 'clockIn', time: now });
        if (callback) callback(true);
      },
      error: (err) => {
        this.isProcessingPunch = false;
        console.error('Error clocking in:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to record Clock-In. Please try again.';
        this.toaster.error(msg, 'Error');
        if (callback) callback(false, msg);
      }
    });
  }

  public clockOut(callback?: (success: boolean, errorMsg?: string) => void) {
    if (this.isTodayRegularized) {
      const msg = "Today's attendance has been regularized. Punching (Clock-In / Clock-Out) is disabled for today.";
      this.toaster.warning(msg, 'Attendance Regularized');
      if (callback) callback(false, msg);
      return;
    }
    if (this.isProcessingPunch) {
      if (callback) callback(false, 'A punch action is already in progress.');
      return;
    }
    const empId = Number(this.employeeId);
    if (!empId) {
      const msg = 'Unable to identify logged-in employee session.';
      this.toaster.error(msg, 'Session Error');
      if (callback) callback(false, msg);
      return;
    }

    this.isProcessingPunch = true;
    const now = new Date();
    const inTime = this.clockInTime || now;
    const diffMs = Math.max(0, now.getTime() - inTime.getTime());
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    const effectiveHours = totalHours;

    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const durationStr = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;

    const nowIso = now.toISOString();
    const inIso = inTime.toISOString();
    const todayStr = this.toYMD(now);

    this.attendanceService.createData(
      empId,
      inIso,
      nowIso,
      totalHours,
      effectiveHours,
      'Present',
      nowIso,
      todayStr
    ).subscribe({
      next: () => {
        this.isProcessingPunch = false;
        this.setClockedOutState(inTime, now, durationStr);
        this.toaster.info(`Clocked Out at ${this.formatTime12(now)}`, 'Session Ended');
        this.punchChanged$.next({ type: 'clockOut', time: now });
        if (callback) callback(true);
      },
      error: (err) => {
        this.isProcessingPunch = false;
        console.error('Error clocking out:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to record Clock-Out. Please try again.';
        this.toaster.error(msg, 'Error');
        if (callback) callback(false, msg);
      }
    });
  }

  private updateClock() {
    const now = new Date();
    this.currentTimeSubject.next(this.formatTime12(now));

    if (this.isClockedIn && this.clockInTime) {
      const diffMs = Math.max(0, now.getTime() - this.clockInTime.getTime());
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      this.sessionElapsedSubject.next(
        `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
      );
    } else {
      this.sessionElapsedSubject.next('00h 00m 00s');
    }
  }

  public formatTime12(d: Date | null): string {
    if (!d) return '--';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  public toYMD(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') {
      const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const d = this.parseDateSafe(val);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  public parseDateSafe(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) return null;

    // If pure date string (YYYY-MM-DD), parse in local time to prevent day rollback
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    // If string already has timezone info (Z, +HH:MM, -HH:MM), parse as-is
    if (s.endsWith('Z') || s.includes('+') || s.match(/-\d{2}:\d{2}$/)) {
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // No timezone info — SQL Server / .NET returns UTC datetimes without 'Z'.
    // Appending 'Z' forces correct UTC interpretation so toLocaleTimeString()
    // converts to the user's local timezone (e.g. UTC 05:18 → IST 10:48 AM).
    const withZ = new Date(s + 'Z');
    if (!isNaN(withZ.getTime())) return withZ;

    // Final fallback: parse as-is
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  private isRealTime(val?: any): boolean {
    if (!val) return false;
    const s = String(val).trim();
    if (!s || s === '--' || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) {
      return false;
    }
    const d = this.parseDateSafe(val);
    return !!(d && !isNaN(d.getTime()));
  }
}
