import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { EmailService } from '../../services/leaveRequest/email.service';

export interface DateStatusBadge {
  label: string;
  type: 'present' | 'absent' | 'leave' | 'pending' | 'holiday' | 'neutral';
  icon: string;
  details?: string;
}

@Component({
  selector: 'app-attendasedit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatDividerModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatRadioModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './attendasedit.component.html',
  styleUrl: './attendasedit.component.scss'
})
export class AttendaseditComponent implements OnInit {
  services = inject(EmployeeeService);
  holidayService = inject(HolidayservicesService);
  emailService = inject(EmailService);
  formbuilder = inject(FormBuilder);
  toaster = inject(ToastrService);

  logs: { clockIn: string; clockOut: string }[] = [];
  canSubmit: boolean = true;
  isSubmitting: boolean = false;
  submitError: string = '';
  statusMessage: string = '';
  currentStatus: string = '';
  rejectionReason: string = '';
  autoSelectedAbsentNotice: string = '';
  selectedDateStatusBadge: DateStatusBadge | null = null;

  getYesterday(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  hasExistingClockIn: boolean = false;
  existingClockInDisplay: string = '';
  minDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  maxDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Calendar State Sets
  presentDateMap = new Map<string, { clockIn: string; clockOut: string; status: string }>();
  absentDateSet = new Set<string>();
  missingPunchMap = new Map<string, { clockIn: string; clockOut?: string; clockInRaw?: any }>();
  leaveDateSet = new Set<string>();
  pendingDateSet = new Set<string>();
  approvedDateSet = new Set<string>();
  holidayDateSet = new Set<string>();
  rejectedDateMap = new Map<string, string>();

  attendaseform = this.formbuilder.group({
    RequestType: ['Regularization', Validators.required],
    selectedDate: [new Date(Date.now() - 24 * 60 * 60 * 1000), Validators.required],
    Reason: ['', Validators.required],
    clockIn: ['09:30', Validators.required],
    clockOut: ['18:30', Validators.required],
    clientName: [''],
    workLocation: [''],
    wfhDuration: ['Full Day']
  });

  onRequestTypeChange(type: string): void {
    this.attendaseform.patchValue({ RequestType: type });
    if (type === 'Regularization') {
      this.maxDate = this.getYesterday();
      const currentSelected = this.attendaseform.get('selectedDate')?.value;
      if (currentSelected instanceof Date) {
        const curYmd = this.toLocalYMD(currentSelected);
        const todayYmd = this.toLocalYMD(new Date());
        if (curYmd >= todayYmd) {
          this.attendaseform.patchValue({ selectedDate: this.getYesterday() });
        }
      }
    } else {
      // WFH and On-Duty can be requested in advance
      this.maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      this.attendaseform.get('clockIn')?.enable();
      this.attendaseform.patchValue({
        clockIn: '09:30',
        clockOut: type === 'Work From Home' && this.attendaseform.get('wfhDuration')?.value === 'Half Day' ? '14:00' : '18:30'
      });
    }
    const curVal = this.attendaseform.get('selectedDate')?.value;
    if (curVal instanceof Date) {
      this.evaluateDateRegularization(curVal);
    }
  }

  // Calendar cell highlight function for MatDatepicker
  dateClassFn: MatCalendarCellClassFunction<Date> = (cellDate: Date, view: string) => {
    if (view === 'month') {
      const dateStr = this.toLocalYMD(cellDate);
      if (this.pendingDateSet.has(dateStr)) return 'cal-cell-pending';
      if (this.leaveDateSet.has(dateStr)) return 'cal-cell-leave';
      if (this.missingPunchMap.has(dateStr)) return 'cal-cell-absent';
      if (this.absentDateSet.has(dateStr)) return 'cal-cell-absent';
      if (this.presentDateMap.has(dateStr) || this.approvedDateSet.has(dateStr)) return 'cal-cell-present';
      if (this.holidayDateSet.has(dateStr)) return 'cal-cell-holiday';
    }
    return '';
  };

  constructor(private dialogref: MatDialogRef<AttendaseditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.hasExistingClockIn = !!this.data?.hasExistingClockIn;
    this.existingClockInDisplay = this.data?.existingClockInDisplay
      ? this.formatTime12(this.data.existingClockInDisplay)
      : (this.data?.clockIn ? this.formatTime12(this.data.clockIn) : '');

    // Clamp minDate to joiningDate if joiningDate is later than 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const joiningDate = this.data?.joiningDate ? new Date(this.data.joiningDate) : null;
    if (joiningDate && !isNaN(joiningDate.getTime())) {
      joiningDate.setHours(0, 0, 0, 0);
      this.minDate = joiningDate > thirtyDaysAgo ? joiningDate : thirtyDaysAgo;
    } else {
      this.minDate = thirtyDaysAgo;
    }

    let parsedDate = this.parseInputDate(this.data);
    const initialReqType = this.data?.requestType || 'Regularization';
    if (initialReqType === 'Regularization') {
      const todayStr = this.toLocalYMD(new Date());
      const parsedStr = this.toLocalYMD(parsedDate);
      if (parsedStr >= todayStr) {
        parsedDate = this.getYesterday();
      }
    }

    this.attendaseform.patchValue({
      selectedDate: parsedDate,
      clockIn: this.data?.clockIn ? this.formatTime24(this.data.clockIn) : '09:30',
      clockOut: this.data?.clockOut ? this.formatTime24(this.data.clockOut) : '18:30',
      Reason: this.hasExistingClockIn ? 'Forgot to Clock Out' : ''
    });

    if (this.data?.lockDate) {
      this.attendaseform.get('selectedDate')?.disable();
    }

    if (this.hasExistingClockIn) {
      this.attendaseform.get('clockIn')?.disable();
    }

    this.attendaseform.get('selectedDate')?.valueChanges.subscribe((newDate: any) => {
      if (newDate instanceof Date) {
        this.evaluateDateRegularization(newDate);
      }
    });
  }

  ngOnInit(): void {
    let records = this.data?.attendanceRecords || [];
    let requests = this.data?.existingRequests || [];
    let leaves = this.data?.leaves || [];
    let holidays = this.data?.holidays || [];

    if (this.data?.requestType) {
      this.onRequestTypeChange(this.data.requestType);
    }

    const initSets = () => {
      this.buildAttendanceSets(records, requests, leaves, holidays);
      this.autoSelectAbsentIfPresentPassed();
    };

    // If holidays or leaves are missing from dialog data, fetch them
    if (!holidays || holidays.length === 0) {
      this.holidayService.getHoliday().subscribe({
        next: (res: any) => {
          holidays = Array.isArray(res) ? res : (res?.data || res?.result || []);
          initSets();
        },
        error: () => {}
      });
    }

    if (!leaves || leaves.length === 0) {
      this.emailService.getData().subscribe({
        next: (res: any) => {
          leaves = Array.isArray(res) ? res : (res?.data || res?.result || []);
          initSets();
        },
        error: () => {}
      });
    }

    if (records.length > 0 || requests.length > 0) {
      initSets();
    } else {
      // Fetch attendance data directly to power the calendar badges
      this.services.getAllData().subscribe({
        next: (res: any) => {
          records = Array.isArray(res) ? res : (res?.data || res?.result || []);
          initSets();
        },
        error: () => {
          initSets();
        }
      });
    }
  }

  private buildAttendanceSets(records: any[], requests: any[], leaves: any[], holidays: any[]): void {
    this.presentDateMap.clear();
    this.absentDateSet.clear();
    this.missingPunchMap.clear();
    this.leaveDateSet.clear();
    this.pendingDateSet.clear();
    this.approvedDateSet.clear();
    this.holidayDateSet.clear();
    this.rejectedDateMap.clear();

    const empId = this.data?.employeeId ? Number(this.data.employeeId) : this.getLoggedInEmpId();

    // 1. Process Holidays
    (holidays || []).forEach((h: any) => {
      if (h.isDeleted || h.isActive === false || h.isActive === 0) return;
      const rawDate = h.holidayDate || h.HolidayDate || h.date || h.Date;
      const dStr = this.toLocalYMD(rawDate);
      if (dStr) this.holidayDateSet.add(dStr);
    });

    // 2. Process Leaves (Approved and Pending)
    (leaves || []).forEach((l: any) => {
      if (l.isDeleted || l.isDeleted === 1 || l.isDeleted === true) return;
      const lEmpId = Number(l.employeeId ?? l.EmployeeId ?? 0);
      const st = String(l.status || l.Status || '').toLowerCase().trim();
      if ((!empId || lEmpId === 0 || lEmpId === empId) && (st === 'approved' || st === 'pending')) {
        const rawStart = l.startDate || l.StartDate || l.fromDate || l.FromDate;
        const rawEnd = l.endDate || l.EndDate || l.toDate || l.ToDate || rawStart;
        const start = this.parseDateSafe(rawStart);
        const end = this.parseDateSafe(rawEnd) || start;
        if (start && end) {
          const cur = new Date(start);
          while (cur <= end) {
            this.leaveDateSet.add(this.toLocalYMD(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    });

    // 3. Process Regularization Requests
    (requests || []).forEach((r: any) => {
      const rEmpId = Number(r.employeeId || r.EmployeeId);
      if (!empId || rEmpId === empId) {
        const rawDate = r.requestedDate || r.RequestedDate || r.attendanceDate || r.AttendanceDate;
        const dStr = this.toLocalYMD(new Date(rawDate));
        if (dStr) {
          const st = String(r.status || r.Status || '').toLowerCase().trim();
          if (st === 'pending') {
            this.pendingDateSet.add(dStr);
          } else if (st === 'approved') {
            this.approvedDateSet.add(dStr);
          } else if (st === 'rejected') {
            this.rejectedDateMap.set(dStr, r.rejectionReason || r.RejectionReason || '');
          }
        }
      }
    });

    // 4. Process Attendance Records
    (records || []).forEach((a: any) => {
      const aEmpId = Number(a.employeeId || a.EmployeeId || a.id);
      if (!empId || aEmpId === empId) {
        const dStr = this.toLocalYMD(a.attendanceDate || a.AttendanceDate || a.date || a.Date);
        if (dStr) {
          const hasIn = this.isValidTime(a.clockIn || a.ClockIn);
          const hasOut = this.isValidTime(a.clockOut || a.ClockOut);
          const st = String(a.attendance || a.Attendance || '').toLowerCase();

          if (hasIn && hasOut) {
            this.presentDateMap.set(dStr, {
              clockIn: this.formatTime24(a.clockIn || a.ClockIn),
              clockOut: this.formatTime24(a.clockOut || a.ClockOut),
              status: 'Present'
            });
          } else if (hasIn && !hasOut) {
            this.missingPunchMap.set(dStr, {
              clockIn: this.formatTime24(a.clockIn || a.ClockIn),
              clockInRaw: a.clockIn || a.ClockIn
            });
          } else if (st === 'absent' || (!hasIn && !hasOut)) {
            this.absentDateSet.add(dStr);
          }
        }
      }
    });

    // 5. Identify past working days without records as Absent
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const joining = this.data?.joiningDate ? new Date(this.data.joiningDate) : null;
    if (joining) joining.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dStr = this.toLocalYMD(d);
      const dow = d.getDay(); // 0 = Sun, 6 = Sat

      if (dow === 0 || dow === 6) continue; // skip weekends
      if (this.holidayDateSet.has(dStr)) continue;
      if (this.leaveDateSet.has(dStr)) continue;
      if (joining && d < joining) continue;

      if (!this.presentDateMap.has(dStr) && !this.missingPunchMap.has(dStr) && !this.approvedDateSet.has(dStr)) {
        this.absentDateSet.add(dStr);
      }
    }
  }

  private autoSelectAbsentIfPresentPassed(): void {
    if (this.data?.lockDate) {
      const cur = this.attendaseform.get('selectedDate')?.value;
      if (cur instanceof Date) this.evaluateDateRegularization(cur);
      return;
    }

    const currentSelected = this.attendaseform.get('selectedDate')?.value;
    if (!(currentSelected instanceof Date)) return;

    const currentYMD = this.toLocalYMD(currentSelected);
    const isToday = currentYMD === this.toLocalYMD(new Date());
    const isAlreadyPresent = this.presentDateMap.has(currentYMD) && !this.missingPunchMap.has(currentYMD);

    // If initial date is today or already fully recorded as Present, look for the most recent absent day
    if (isAlreadyPresent || isToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let foundAbsentDate: Date | null = null;

      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dStr = this.toLocalYMD(d);

        // Skip if already pending or approved, or is holiday/leave
        if (this.pendingDateSet.has(dStr) || this.approvedDateSet.has(dStr)) continue;
        if (this.holidayDateSet.has(dStr) || this.leaveDateSet.has(dStr)) continue;

        if (this.missingPunchMap.has(dStr) || this.absentDateSet.has(dStr)) {
          foundAbsentDate = d;
          break;
        }
      }

      if (foundAbsentDate) {
        this.attendaseform.patchValue({ selectedDate: foundAbsentDate });
        const formattedFound = foundAbsentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const reasonText = isAlreadyPresent ? 'already clocked in & out for yesterday' : "today's workday is ongoing";
        this.autoSelectedAbsentNotice = `Automatically selected your most recent absent/incomplete punch date (${formattedFound}) since you were ${reasonText}.`;
        this.evaluateDateRegularization(foundAbsentDate);
      } else {
        this.evaluateDateRegularization(currentSelected);
      }
    } else {
      this.evaluateDateRegularization(currentSelected);
    }
  }

  evaluateDateRegularization(date: Date): void {
    if (!date || isNaN(date.getTime())) return;
    const dateStr = this.toLocalYMD(date);

    // 1. Check Pre-joining Date
    if (this.data?.joiningDateStr && dateStr < this.data.joiningDateStr) {
      this.canSubmit = false;
      this.currentStatus = 'PreJoining';
      this.statusMessage = `Cannot regularize attendance prior to your official joining date (${this.data.joiningDateStr}).`;
      this.selectedDateStatusBadge = { label: 'Pre-Joining Date', type: 'neutral', icon: 'block', details: `Official joining date is ${this.data.joiningDateStr}.` };
      return;
    }

    // 2. Check Pending Request
    if (this.pendingDateSet.has(dateStr)) {
      this.canSubmit = false;
      this.currentStatus = 'Pending';
      this.statusMessage = 'A regularization request for this date is currently pending manager approval.';
      this.selectedDateStatusBadge = { label: 'Regularization Pending Approval', type: 'pending', icon: 'hourglass_empty', details: 'A submitted request is awaiting supervisor review.' };
      return;
    }

    // 3. Check Approved Request
    if (this.approvedDateSet.has(dateStr)) {
      this.canSubmit = false;
      this.currentStatus = 'Approved';
      this.statusMessage = 'Attendance for this date has already been approved and regularized.';
      this.selectedDateStatusBadge = { label: 'Already Regularized & Approved', type: 'present', icon: 'check_circle', details: 'Attendance for this date has already been finalized.' };
      return;
    }

    // 4. Check Previously Rejected Request
    if (this.rejectedDateMap.has(dateStr)) {
      this.canSubmit = true;
      this.currentStatus = 'Rejected';
      this.rejectionReason = this.rejectedDateMap.get(dateStr) || 'No reason provided';
      this.statusMessage = '';
      this.selectedDateStatusBadge = {
        label: 'Previous Request Rejected',
        type: 'absent',
        icon: 'replay',
        details: `Rejected: "${this.rejectionReason}". You may adjust your punch times and submit again.`
      };
      this.applyPunchesForDate(dateStr);
      return;
    }

    // 5. Check Today or Future Date for Regularization (ongoing or future day)
    const todayStr = this.toLocalYMD(new Date());
    const reqType = this.attendaseform.get('RequestType')?.value || 'Regularization';

    if (reqType === 'Regularization' && dateStr >= todayStr) {
      this.canSubmit = false;
      this.currentStatus = 'TodayNotAllowed';
      this.rejectionReason = '';
      this.statusMessage = 'Attendance regularization can only be requested for past completed workdays. Current day attendance must be recorded using Clock-In / Clock-Out.';
      this.selectedDateStatusBadge = {
        label: dateStr === todayStr ? "Today's Workday (In Progress)" : 'Future Date',
        type: 'absent',
        icon: 'block',
        details: 'Attendance regularization cannot be requested for today or future dates. Please use Clock-In / Clock-Out for today.'
      };
      return;
    }

    if (dateStr === todayStr) {
      this.canSubmit = true;
      this.currentStatus = '';
      this.rejectionReason = '';
      this.statusMessage = "Note: Today's workday is currently in progress.";
      this.selectedDateStatusBadge = { label: "Today's Workday (In Progress)", type: 'neutral', icon: 'timelapse', details: 'Applying request for current date.' };
      this.applyPunchesForDate(dateStr);
      return;
    }

    // 6. Check Leave (Disallow Regularization)
    if (this.leaveDateSet.has(dateStr)) {
      this.canSubmit = false;
      this.currentStatus = 'LeaveNotAllowed';
      this.rejectionReason = '';
      this.statusMessage = 'Attendance regularization cannot be requested for dates on which you have scheduled or approved leave.';
      this.selectedDateStatusBadge = {
        label: 'On Leave',
        type: 'leave',
        icon: 'beach_access',
        details: 'An active leave request exists for this date. Attendance regularization is not permitted.'
      };
      return;
    }

    // 7. Check Holiday (Disallow Regularization)
    if (this.holidayDateSet.has(dateStr)) {
      this.canSubmit = false;
      this.currentStatus = 'HolidayNotAllowed';
      this.rejectionReason = '';
      this.statusMessage = 'Attendance regularization cannot be requested for designated company holidays.';
      this.selectedDateStatusBadge = {
        label: 'Company Holiday',
        type: 'holiday',
        icon: 'celebration',
        details: 'This date is a designated company holiday. Attendance regularization is not permitted.'
      };
      return;
    }

    // 8. Normal Working Day: Missing Punch, Absent, or Present
    this.canSubmit = true;
    this.currentStatus = '';
    this.rejectionReason = '';
    this.statusMessage = '';
    this.applyPunchesForDate(dateStr);
  }

  private applyPunchesForDate(dateStr: string): void {
    if (this.missingPunchMap.has(dateStr)) {
      const punch = this.missingPunchMap.get(dateStr)!;
      this.hasExistingClockIn = true;
      this.existingClockInDisplay = this.formatTime12(punch.clockInRaw || punch.clockIn);
      this.attendaseform.patchValue({
        clockIn: punch.clockIn,
        clockOut: '18:30'
      });
      if (!this.attendaseform.get('Reason')?.value) {
        this.attendaseform.patchValue({ Reason: 'Forgot to Clock Out' });
      }
      this.attendaseform.get('clockIn')?.disable();
      this.selectedDateStatusBadge = {
        label: 'Incomplete Punch (Missing Clock-Out)',
        type: 'absent',
        icon: 'warning_amber',
        details: `Clock-In verified at ${this.existingClockInDisplay}. Departure punch is missing.`
      };
    } else if (this.absentDateSet.has(dateStr)) {
      this.hasExistingClockIn = false;
      this.existingClockInDisplay = '';
      this.attendaseform.get('clockIn')?.enable();
      this.attendaseform.patchValue({
        clockIn: '09:30',
        clockOut: '18:30'
      });
      this.selectedDateStatusBadge = {
        label: 'Marked as Absent (No Punches)',
        type: 'absent',
        icon: 'cancel',
        details: 'No clock-in/out records found for this workday.'
      };
    } else if (this.presentDateMap.has(dateStr)) {
      const pres = this.presentDateMap.get(dateStr)!;
      this.hasExistingClockIn = false;
      this.existingClockInDisplay = '';
      this.attendaseform.get('clockIn')?.enable();
      this.attendaseform.patchValue({
        clockIn: pres.clockIn || '09:30',
        clockOut: pres.clockOut || '18:30'
      });
      this.selectedDateStatusBadge = {
        label: 'Marked as Present (Punches Recorded)',
        type: 'present',
        icon: 'check_circle',
        details: `Clock-In: ${this.formatTime12(pres.clockIn)} | Clock-Out: ${this.formatTime12(pres.clockOut)}. Adjust only if timings are incorrect.`
      };
    } else {
      this.hasExistingClockIn = false;
      this.existingClockInDisplay = '';
      this.attendaseform.get('clockIn')?.enable();
      if (!this.selectedDateStatusBadge) {
        this.selectedDateStatusBadge = {
          label: 'Past Workday',
          type: 'neutral',
          icon: 'calendar_today',
          details: 'Enter revised punch times for manager review.'
        };
      }
    }
  }

  private parseDateSafe(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    if (s.endsWith('Z') || s.includes('+') || s.match(/-\d{2}:\d{2}$/)) {
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    }

    const withZ = new Date(s + 'Z');
    if (!isNaN(withZ.getTime())) return withZ;

    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  private toLocalYMD(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = date instanceof Date ? date : this.parseDateSafe(date);
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dNum = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dNum}`;
  }

  private isValidTime(val: any): boolean {
    if (!val) return false;
    if (val === '0001-01-01T00:00:00' || val === '1970-01-01T00:00:00') return false;
    const d = this.parseDateSafe(val);
    return !d ? false : (!isNaN(d.getTime()) && d.getFullYear() > 2000);
  }

  private formatTime24(val: any): string {
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

  private formatTime12(val: any): string {
    if (!val) return '';
    const s = String(val).trim();
    if (/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.test(s)) {
      return s.toUpperCase();
    }
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      let [h, m] = s.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    const d = this.parseDateSafe(val);
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return s;
  }

  private getLoggedInEmpId(): number {
    const raw = (typeof localStorage !== 'undefined' ? (localStorage.getItem('employeeId') || localStorage.getItem('userId')) : null)
      || (typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('employeeId') || sessionStorage.getItem('userId')) : null);
    return raw ? Number(raw) : 1;
  }

  private parseInputDate(data: any): Date {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (!data) return yesterday;

    // 1. Direct Date object
    if (data.dateObj instanceof Date && !isNaN(data.dateObj.getTime())) {
      return data.dateObj;
    }
    if (data.date instanceof Date && !isNaN(data.date.getTime())) {
      return data.date;
    }

    // 2. ISO / YYYY-MM-DD string
    const rawStr = data.dateStr || data.date || data.Date;
    if (typeof rawStr === 'string' && rawStr.trim() && rawStr !== 'Select Date') {
      const cleanStr = rawStr.trim();

      // Standard ISO or YYYY-MM-DD parse
      const direct = new Date(cleanStr);
      if (!isNaN(direct.getTime()) && !cleanStr.includes(',')) {
        return direct;
      }

      // Handle strings like "7 sept, fri", "07 Sep, Mon", "7 September, Friday", etc.
      const noWeekday = cleanStr
        .replace(/(,\s*)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*/gi, '')
        .replace(/^[,\s]+|[,\s]+$/g, '');

      const currentYear = new Date().getFullYear();
      const withYear = new Date(`${noWeekday} ${currentYear}`);
      if (!isNaN(withYear.getTime())) {
        return withYear;
      }

      const match = cleanStr.match(/(\d{1,2})\s+([a-zA-Z]+)/);
      if (match) {
        const day = parseInt(match[1], 10);
        const monthStr = match[2].toLowerCase().slice(0, 3);
        const monthMap: { [key: string]: number } = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        if (monthMap[monthStr] !== undefined) {
          return new Date(currentYear, monthMap[monthStr], day, 12, 0, 0);
        }
      }
    }

    return yesterday;
  }

  addLog() {
    if (this.data) {
      this.logs.push({
        clockIn: this.data.clockIn,
        clockOut: this.data.clockOut,
      })
    }
    // this.logs.push({ inTime: '', outTime: '' });
  }
  removeLog(index: number) {
    this.logs.splice(index);
  }


  // submitdata() {
  //   if (this.attendaseform.valid) {
  //     console.log('Form Data:', this.attendaseform.value);
  //     this.services.creatRegular(this.attendaseform.value).subscribe(() => {
  //       console.log("successfully add")
  //       this.dialogref.close(true);
  //     })

  //   }
  // }
 
  combine(date: Date, time: string): string {
    const [h, m] = (time || '00:00').split(':').map(Number);
    // Construct local Date in browser's local timezone, then convert to UTC ISO string
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h || 0, m || 0, 0);
    return localDate.toISOString();
  }

  formatDateOnly(date: Date): string {
    const y = date.getFullYear();
    const mon = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${y}-${mon}-${day}T12:00:00`;
  }

  submitdata(): void {
    if (this.isSubmitting) return;

    if (!this.canSubmit) {
      this.toaster.warning(this.statusMessage || 'Regularization cannot be submitted for this date.');
      return;
    }

    if (!this.attendaseform.valid) {
      this.toaster.warning('Please fill all required fields');
      return;
    }

    const { RequestType, selectedDate, clockIn, clockOut, Reason, clientName, workLocation, wfhDuration } = this.attendaseform.getRawValue();

    if (!selectedDate || !Reason) {
      this.toaster.warning('All fields are required');
      return;
    }

    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const y = selectedDate.getFullYear();
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const todayStr = this.toLocalYMD(new Date());

      if (RequestType === 'Regularization' && dateStr >= todayStr) {
        this.toaster.warning('Attendance regularization can only be requested for past completed workdays. Current day attendance must be recorded using Clock-In / Clock-Out.');
        return;
      }

      if (this.data?.joiningDateStr && dateStr < this.data.joiningDateStr) {
        this.toaster.error(`Cannot submit attendance request prior to your official joining date (${this.data.joiningDateStr}).`);
        return;
      }

      if (this.holidayDateSet.has(dateStr)) {
        this.toaster.error('Cannot submit attendance regularization on a designated company holiday.');
        return;
      }

      if (this.leaveDateSet.has(dateStr)) {
        this.toaster.error('Cannot submit attendance regularization for dates on which you have an active leave request.');
        return;
      }
    }

    const loggedUser = (typeof localStorage !== 'undefined' ? (localStorage.getItem('employeeId') || localStorage.getItem('userId')) : null)
      || (typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('employeeId') || sessionStorage.getItem('userId')) : null);
    const employeeId = this.data?.employeeId ? Number(this.data.employeeId) : (loggedUser ? Number(loggedUser) : null);

    let finalReason = Reason.trim();
    if (RequestType === 'On-Duty' && clientName) {
      finalReason = `[Client: ${clientName.trim()}${workLocation ? ', Location: ' + workLocation.trim() : ''}] ${finalReason}`;
    } else if (RequestType === 'Work From Home' && wfhDuration) {
      finalReason = `[${wfhDuration}] ${finalReason}`;
    }

    const payload = {
      EmployeeId: employeeId,
      RequestType: RequestType || 'Regularization',
      Reason: finalReason,
      RequestedDate: this.formatDateOnly(selectedDate),
      clockIn: this.combine(selectedDate, clockIn || '09:30'),
      clockOut: this.combine(selectedDate, clockOut || '18:30'),
    };

    this.isSubmitting = true;
    this.submitError = '';
    this.dialogref.disableClose = true;

    this.services.creatRegular(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        const typeLabel = RequestType === 'Work From Home' ? 'Work From Home' : (RequestType === 'On-Duty' ? 'On-Duty' : 'Regularization');
        this.toaster.success(`${typeLabel} request submitted successfully for approval`);
        this.dialogref.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.dialogref.disableClose = false;
        console.error('API error:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Submission failed. Please try again.';
        this.submitError = msg;
        this.toaster.error(msg, 'Error');
      }
    });
  }

  closeDialog() {
    if (this.isSubmitting) return;
    this.dialogref.close();
  }
}
