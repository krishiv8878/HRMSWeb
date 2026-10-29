import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { TimesheetService } from '../../services/timesheet/timesheet.service';
import {
  TimesheetView,
  TimesheetDayView,
  TimesheetTaskItem,
  TimesheetEntryPayload,
  TimesheetSubmitPayload
} from '../../interface/timesheet.interface';
import { TimesheetTaskModalComponent } from '../../modal/timesheet-task-modal/timesheet-task-modal.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { TimesheetSubmitModalComponent } from '../../modal/timesheet-submit-modal/timesheet-submit-modal.component';

import { ProjectsService } from '../../services/project/projects.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './timesheet.component.html',
  styleUrl: './timesheet.component.scss'
})
export class TimesheetComponent implements OnInit {
  private timesheetService = inject(TimesheetService);
  private projectsService = inject(ProjectsService);
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  periodType: 'Weekly' | 'Monthly' = 'Weekly';
  currentStartDate: Date = new Date();
  currentEndDate: Date = new Date();

  timesheetData: TimesheetView | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false;

  // Project master list & active top-level filter
  projects: any[] = [];
  selectedProjectId: number | null = null;
  todayStr: string = '';
  joiningDate: Date | null = null;
  joiningDateStr: string = '';
  selectedDayDate: string = '';

  get miniCalendarMonthTitle(): string {
    return this.currentStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get miniCalendarDays(): any[] {
    if (!this.timesheetData?.days || this.timesheetData.days.length === 0) {
      return [];
    }
    return this.timesheetData.days.map(d => {
      const parts = d.date.split('-');
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return {
        dateStr: d.date,
        dayNumber: dt.getDate(),
        dayNameShort: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        isSelected: d.date === this.selectedDayDate,
        isToday: d.date === this.todayStr,
        isWeekend: d.isWeekend,
        isAbsent: this.isDayAbsent(d),
        isCurrentMonth: dt.getMonth() === this.currentStartDate.getMonth(),
        hasTasks: this.getDayTasks(d).length > 0
      };
    });
  }

  selectCalendarDay(dateStr: string): void {
    this.selectedDayDate = dateStr;
    if (typeof document !== 'undefined') {
      const el = document.getElementById('day-card-' + dateStr);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  get workingDaysCount(): number {
    if (!this.timesheetData?.days) return 5;
    return this.timesheetData.days.filter(d => !d.isWeekend && !d.isHoliday && !d.isPriorToJoining).length;
  }

  get standardTargetHours(): number {
    return (this.workingDaysCount || 5) * 8;
  }

  get loggedHoursPercentage(): number {
    const target = this.standardTargetHours;
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((this.filteredTotalHours / target) * 100));
  }

  get pendingDaysCount(): number {
    if (!this.timesheetData?.days) return 0;
    return this.timesheetData.days.filter(d => 
      !d.isWeekend && 
      !d.isHoliday && 
      !d.isPriorToJoining && 
      !this.isFutureDay(d.date) && 
      this.getDayTasks(d).length === 0
    ).length;
  }

  get userDisplayName(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('username') || localStorage.getItem('name') || this.timesheetData?.employeeName || 'User';
    }
    return 'User';
  }

  get userInitials(): string {
    const name = this.userDisplayName;
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  ngOnInit(): void {
    this.todayStr = this.formatDateString(new Date());
    this.loadEmployeeProfile();
    this.loadProjects();
    this.calculatePeriodDates(new Date());
    this.loadTimesheet();
  }

  loadEmployeeProfile(): void {
    const currentEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    if (currentEmpId > 0) {
      this.employeeService.getEmployeeById(currentEmpId).subscribe({
        next: (res: any) => {
          const emp = res?.data || res;
          if (emp) {
            const doj = emp.dateOfJoining || emp.DateOfJoining || emp.joiningDate;
            if (doj) {
              const dt = new Date(doj);
              if (!isNaN(dt.getTime())) {
                this.joiningDate = dt;
                this.joiningDateStr = this.formatDateString(dt);
                if (this.timesheetData?.days) {
                  this.timesheetData.days.forEach(d => {
                    if (this.joiningDateStr && d.date < this.joiningDateStr) {
                      d.isPriorToJoining = true;
                    }
                  });
                }
              }
            }
          }
        },
        error: () => {}
      });
    }
  }

  loadProjects(): void {
    const currentEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;

    this.projectsService.getAllData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }
        const activeProjects = list.filter((p: any) => !p.isDeleted && p.isActive !== false);

        if (currentEmpId > 0) {
          this.employeeService.getData().subscribe({
            next: (empRes: any) => {
              let emps: any[] = [];
              if (Array.isArray(empRes)) emps = empRes;
              else if (empRes && Array.isArray(empRes.data)) emps = empRes.data;
              else if (empRes && Array.isArray(empRes.employeedata?.data)) emps = empRes.employeedata.data;

              const matchedEmp = emps.find(e => Number(e.id || e.employeeId) === currentEmpId);
              if (matchedEmp && Array.isArray(matchedEmp.projectIds) && matchedEmp.projectIds.length > 0) {
                const assignedIds = matchedEmp.projectIds.map((id: any) => Number(id));
                const filtered = activeProjects.filter((p: any) => assignedIds.includes(Number(p.id || p.projectMasterId)));
                this.projects = filtered.length > 0 ? filtered : activeProjects;
              } else {
                this.projects = activeProjects;
              }

              if (this.projects.length > 0 && !this.selectedProjectId) {
                const first = this.projects[0];
                this.selectedProjectId = Number(first.id || first.projectMasterId);
              }
            },
            error: () => {
              this.projects = activeProjects;
              if (this.projects.length > 0 && !this.selectedProjectId) {
                const first = this.projects[0];
                this.selectedProjectId = Number(first.id || first.projectMasterId);
              }
            }
          });
        } else {
          this.projects = activeProjects;
          if (this.projects.length > 0 && !this.selectedProjectId) {
            const first = this.projects[0];
            this.selectedProjectId = Number(first.id || first.projectMasterId);
          }
        }
      },
      error: () => {
        this.projects = [];
      }
    });
  }

  get selectedProject(): any {
    if (!this.selectedProjectId) return null;
    return this.projects.find(p => Number(p.id || p.projectMasterId) === Number(this.selectedProjectId)) || null;
  }

  isFutureDay(dateStr: string): boolean {
    return dateStr > this.todayStr;
  }

  getDayTasks(day: TimesheetDayView): TimesheetTaskItem[] {
    if (!day || !day.tasks) return [];
    if (!this.selectedProjectId) return day.tasks;
    return day.tasks.filter(t => t.projectId === Number(this.selectedProjectId));
  }

  getDayTotalHours(day: TimesheetDayView): number {
    return this.getDayTasks(day).reduce((acc, t) => acc + (t.hours || 0), 0);
  }

  get filteredTotalHours(): number {
    if (!this.timesheetData?.days) return 0;
    return this.timesheetData.days.reduce((acc, day) => acc + this.getDayTotalHours(day), 0);
  }

  onProjectChange(): void {
    // Project selection changed - filters day tasks dynamically
  }

  setPeriodType(type: 'Weekly' | 'Monthly'): void {
    if (this.periodType === type) return;
    this.periodType = type;
    this.calculatePeriodDates(new Date());
    this.loadTimesheet();
  }

  private calculatePeriodDates(anchor: Date): void {
    if (this.periodType === 'Weekly') {
      const day = anchor.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);

      // Single current week (Monday to Sunday = 7 days)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      this.currentStartDate = monday;
      this.currentEndDate = sunday;
    } else {
      const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
      this.currentStartDate = firstDay;
      this.currentEndDate = lastDay;
    }
  }

  get isCurrentOrFuturePeriod(): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return this.currentEndDate >= today;
  }

  navigatePeriod(direction: number): void {
    // If attempting to go forward into upcoming future week/month, disallow
    if (direction > 0 && this.isCurrentOrFuturePeriod) {
      return;
    }

    const anchor = new Date(this.currentStartDate);
    if (this.periodType === 'Weekly') {
      anchor.setDate(anchor.getDate() + direction * 7);
    } else {
      anchor.setMonth(anchor.getMonth() + direction);
    }

    // Do not allow navigating beyond current period into upcoming future weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (direction > 0 && anchor > today) {
      this.goToCurrent();
      return;
    }

    this.calculatePeriodDates(anchor);
    this.loadTimesheet();
  }

  goToCurrent(): void {
    this.calculatePeriodDates(new Date());
    this.loadTimesheet();
  }

  private formatDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadTimesheet(): void {
    this.isLoading = true;
    const startStr = this.formatDateString(this.currentStartDate);
    const endStr = this.formatDateString(this.currentEndDate);

    this.timesheetService.getMyTimesheet(startStr, endStr).subscribe({
      next: (res: any) => {
        const rawData = (res && res.data) ? res.data : res;
        this.processTimesheetData(rawData);
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('API fetch warning, initializing default period days:', err);
        this.processTimesheetData(null);
        this.isLoading = false;
      }
    });
  }

  private processTimesheetData(data: any): void {
    const periodDays = this.generateDaysList();

    if (!data) {
      this.timesheetData = {
        timesheetId: 0,
        employeeId: typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0,
        employeeName: 'Employee',
        periodType: this.periodType,
        startDate: this.formatDateString(this.currentStartDate),
        endDate: this.formatDateString(this.currentEndDate),
        totalTimesheetHours: 0,
        totalAttendanceHours: 0,
        status: 'Draft',
        days: periodDays
      };
      return;
    }

    // Map incoming server days or merge with generated period days
    const serverDays: any[] = data.days || [];
    const mergedDays: TimesheetDayView[] = periodDays.map((defaultDay) => {
      const matched = serverDays.find((sd: any) => {
        const dStr = (sd.date || '').substring(0, 10);
        return dStr === defaultDay.date;
      });

      if (!matched) return defaultDay;

      const tasks: TimesheetTaskItem[] = (matched.tasks || []).map((t: any) => ({
        id: Number(t.id || 0),
        projectId: Number(t.projectId || 0),
        projectName: t.projectName || 'Project',
        entryDate: (t.entryDate || matched.date || defaultDay.date).substring(0, 10),
        taskDescription: t.taskDescription || '',
        hours: Number(t.hours || 0)
      }));

      const dayTaskTotal = tasks.reduce((sum, t) => sum + t.hours, 0);

      const isPriorToJoining = Boolean(matched.isPriorToJoining) || (this.joiningDateStr && defaultDay.date < this.joiningDateStr);

      return {
        date: defaultDay.date,
        dayName: matched.dayName || defaultDay.dayName,
        dayOfWeek: matched.dayOfWeek || matched.dayName || defaultDay.dayOfWeek,
        clockInTime: matched.clockInTime || matched.clockIn ? this.formatClockDisplay(matched.clockInTime || matched.clockIn) : null,
        clockOutTime: matched.clockOutTime || matched.clockOut ? this.formatClockDisplay(matched.clockOutTime || matched.clockOut) : null,
        attendanceHours: Number(matched.attendanceHours || 0),
        isRegularized: Boolean(matched.isRegularized),
        isShiftInProgress: Boolean(matched.isShiftInProgress),
        tasks: tasks,
        totalDayTaskHours: dayTaskTotal,
        dayTotalHours: dayTaskTotal,
        isHoliday: Boolean(matched.isHoliday),
        holidayName: matched.holidayName || null,
        isOptionalHoliday: Boolean(matched.isOptionalHoliday),
        isLeave: Boolean(matched.isLeave),
        leaveTypeName: matched.leaveTypeName || null,
        isWeekend: Boolean(matched.isWeekend !== undefined ? matched.isWeekend : defaultDay.isWeekend),
        isPriorToJoining: Boolean(isPriorToJoining),
        isAbsent: matched.isAbsent !== undefined ? Boolean(matched.isAbsent) : undefined,
        regularizationStatus: matched.regularizationStatus || null
      };
    });

    const totalTaskHours = mergedDays.reduce((acc, d) => acc + (d.totalDayTaskHours || 0), 0);
    const totalAttHours = mergedDays.reduce((acc, d) => acc + (d.attendanceHours || 0), 0);

    this.timesheetData = {
      timesheetId: data.timesheetId || data.id || 0,
      employeeId: data.employeeId || (typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0),
      employeeName: data.employeeName || 'Employee',
      periodType: data.periodType || this.periodType,
      startDate: (data.startDate || this.formatDateString(this.currentStartDate)).substring(0, 10),
      endDate: (data.endDate || this.formatDateString(this.currentEndDate)).substring(0, 10),
      totalTimesheetHours: Number(data.totalTimesheetHours || totalTaskHours),
      totalAttendanceHours: Number(data.totalAttendanceHours || totalAttHours),
      status: data.status || 'Draft',
      submittedDate: data.submittedDate,
      managerId: data.managerId,
      managerName: data.managerName,
      rejectionReason: data.rejectionReason,
      days: mergedDays
    };

    if (!this.selectedDayDate || !mergedDays.some(d => d.date === this.selectedDayDate)) {
      const hasToday = mergedDays.some(d => d.date === this.todayStr);
      this.selectedDayDate = hasToday ? this.todayStr : (mergedDays[0]?.date || '');
    }
  }

  private generateDaysList(): TimesheetDayView[] {
    const days: TimesheetDayView[] = [];
    const cur = new Date(this.currentStartDate);
    const end = new Date(this.currentEndDate);

    while (cur <= end) {
      const dateStr = this.formatDateString(cur);
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPriorToJoining = !!(this.joiningDateStr && dateStr < this.joiningDateStr);

      days.push({
        date: dateStr,
        dayName: dayName,
        dayOfWeek: dayName,
        clockInTime: null,
        clockOutTime: null,
        attendanceHours: 0,
        isRegularized: false,
        isShiftInProgress: false,
        tasks: [],
        totalDayTaskHours: 0,
        dayTotalHours: 0,
        isHoliday: false,
        holidayName: null,
        isOptionalHoliday: false,
        isLeave: false,
        leaveTypeName: null,
        isWeekend: isWeekend,
        isPriorToJoining: isPriorToJoining
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  private parseDateSafe(val: any): Date | null {
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

  private formatClockDisplay(val: any): string {
    if (!val) return '';
    let s = String(val).trim();
    if (!s || s === '--' || s === 'null' || s === 'undefined' || s.startsWith('0001-01-01') || s.startsWith('1970-01-01')) return '';

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
    if (!d || isNaN(d.getTime()) || d.getFullYear() < 2000) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  isWithinBackfillWindow(dateStr: string): boolean {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    thirtyFiveDaysAgo.setHours(0, 0, 0, 0);
    return d >= thirtyFiveDaysAgo && d <= today;
  }

  get canEdit(): boolean {
    if (!this.timesheetData) return true;
    // Employee can ONLY edit if in Draft or Rejected status.
    // Approved and Submitted timesheets are locked until rejected by a manager/admin.
    return this.timesheetData.status === 'Draft' || this.timesheetData.status === 'Rejected';
  }

  isDayAbsent(day: TimesheetDayView): boolean {
    if (day.isAbsent !== undefined) {
      return Boolean(day.isAbsent);
    }
    if (this.isFutureDay(day.date)) return false;
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) return false;
    if (day.isLeave || day.isHoliday || day.isWeekend) return false;
    if (day.isShiftInProgress) return false;
    if (day.clockInTime || day.isRegularized || (day.attendanceHours && day.attendanceHours > 0)) return false;
    return true;
  }

  canAddTaskForDay(day: TimesheetDayView): boolean {
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) return false;
    if (day.isLeave) return false;
    if (this.isFutureDay(day.date)) return false;
    if (!this.isWithinBackfillWindow(day.date)) return false;
    if (this.isDayAbsent(day)) return false;
    return this.canEdit;
  }

  canEditTask(day: TimesheetDayView): boolean {
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) return false;
    if (day.isLeave) return false;
    if (this.isFutureDay(day.date)) return false;
    if (!this.isWithinBackfillWindow(day.date)) return false;
    if (this.isDayAbsent(day)) return false;
    return this.canEdit;
  }

  openRegularizeModalForDay(day: TimesheetDayView): void {
    if (this.isFutureDay(day.date)) {
      this.toastr.warning('Cannot regularize attendance for future dates.', 'Future Date');
      return;
    }
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) {
      this.toastr.warning(`Cannot regularize attendance prior to your official joining date (${this.joiningDateStr || day.date}).`, 'Prior to Joining');
      return;
    }
    if (day.isHoliday) {
      this.toastr.warning(`Cannot regularize attendance for ${day.date} as it is a designated company holiday (${day.holidayName || 'Holiday'}).`, 'Company Holiday');
      return;
    }
    if (day.isLeave) {
      this.toastr.warning(`Cannot regularize attendance for ${day.date} as you are on leave (${day.leaveTypeName || 'On Leave'}).`, 'On Leave');
      return;
    }
    if (day.regularizationStatus === 'Approved' || day.isRegularized) {
      this.toastr.info('Attendance for this date has already been regularized and approved.', 'Already Regularized');
      return;
    }
    if (day.regularizationStatus === 'Pending') {
      this.toastr.info('An attendance regularization request for this date is already pending approval from your manager.', 'Regularization Pending');
      return;
    }

    const currentEmpId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    const targetDateObj = new Date(day.date + 'T00:00:00');

    const holidays = (this.timesheetData?.days || []).filter(d => d.isHoliday).map(d => ({ holidayDate: d.date, holidayName: d.holidayName }));
    const leaves = (this.timesheetData?.days || []).filter(d => d.isLeave).map(d => ({ startDate: d.date, endDate: d.date, status: 'Approved', leaveTypeName: d.leaveTypeName }));

    const dialogRef = this.dialog.open(AttendaseditComponent, {
      width: '560px',
      data: {
        employeeId: currentEmpId,
        date: targetDateObj,
        dateObj: targetDateObj,
        dateStr: day.date,
        Date: day.date,
        clockIn: '09:30',
        clockOut: '18:30',
        hasExistingClockIn: false,
        existingClockInDisplay: null,
        joiningDate: this.joiningDate,
        joiningDateStr: this.joiningDateStr,
        canRegularize: true,
        regularizationStatus: day.regularizationStatus || null,
        rejectionReason: '',
        holidays,
        leaves
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTimesheet();
    });
  }

  get canSubmit(): boolean {
    if (!this.timesheetData) return false;
    // Can only submit when in Draft or Rejected status
    return this.timesheetData.status === 'Draft' || this.timesheetData.status === 'Rejected';
  }

  openAddTaskModal(day: TimesheetDayView): void {
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) {
      this.toastr.warning(`Cannot log tasks prior to your official joining date (${this.joiningDateStr || day.date}).`, 'Prior to Joining');
      return;
    }

    if (day.isLeave) {
      this.toastr.warning(`Cannot log tasks on an approved leave day (${day.leaveTypeName || 'On Leave'}).`, 'Leave Day');
      return;
    }

    if (this.isDayAbsent(day)) {
      if (day.regularizationStatus === 'Pending') {
        this.toastr.info(`Cannot log tasks for ${day.date}. Your attendance regularization request is currently pending manager approval.`, 'Approval Pending');
      } else {
        this.toastr.warning(`Cannot log tasks for ${day.date} because you were marked absent (no attendance punch recorded). Please regularize attendance first.`, 'Marked Absent');
      }
      return;
    }

    if (this.isFutureDay(day.date)) {
      this.toastr.warning('Cannot log tasks for future dates.', 'Upcoming Date');
      return;
    }

    if (!this.isWithinBackfillWindow(day.date)) {
      this.toastr.warning('Timesheet backfilling is allowed for previous weeks within the current month / past 30 days.', 'Backfill Window');
      return;
    }

    if (this.timesheetData?.status === 'Submitted') {
      this.toastr.warning('Submitted timesheets are awaiting review from your manager and cannot be modified.', 'Awaiting Review');
      return;
    }

    if (this.timesheetData?.status === 'Approved') {
      this.toastr.warning('This timesheet is approved and locked. To make changes or log missing hours, your manager or admin must reject it from their end.', 'Timesheet Approved');
      return;
    }

    if (!this.canEdit) {
      this.toastr.warning('Timesheet is locked for editing.', 'Read Only');
      return;
    }

    if (!this.selectedProjectId) {
      this.toastr.warning('Please select a project from the top dropdown first.', 'Project Required');
      return;
    }

    const ref = this.dialog.open(TimesheetTaskModalComponent, {
      width: '500px',
      data: {
        entryDate: day.date,
        projectId: Number(this.selectedProjectId),
        projectName: this.selectedProject?.projectName || this.selectedProject?.name || 'Assigned Project'
      }
    });

    ref.afterClosed().subscribe((result: TimesheetEntryPayload) => {
      if (result) {
        this.saveTask(result);
      }
    });
  }

  openEditTaskModal(task: TimesheetTaskItem, day: TimesheetDayView): void {
    if (day.isPriorToJoining || (this.joiningDateStr && day.date < this.joiningDateStr)) {
      this.toastr.warning('Cannot edit tasks prior to your official joining date.', 'Prior to Joining');
      return;
    }

    if (day.isLeave) {
      this.toastr.warning('Cannot edit tasks on an approved leave day.', 'Leave Day');
      return;
    }

    if (this.timesheetData?.status === 'Submitted') {
      this.toastr.warning('Submitted timesheets are awaiting review from your manager and cannot be modified.', 'Awaiting Review');
      return;
    }

    if (this.timesheetData?.status === 'Approved') {
      this.toastr.warning('This timesheet is approved and locked. To make changes, your manager or admin must reject it from their end.', 'Timesheet Approved');
      return;
    }

    if (!this.canEdit) {
      this.toastr.warning('Timesheet is locked for editing.', 'Read Only');
      return;
    }

    if (!this.isWithinBackfillWindow(day.date)) {
      this.toastr.warning('Task entries outside the 30-day backfill window cannot be modified.', 'Read Only');
      return;
    }

    const ref = this.dialog.open(TimesheetTaskModalComponent, {
      width: '500px',
      data: {
        id: task.id,
        projectId: task.projectId,
        projectName: task.projectName,
        entryDate: task.entryDate,
        taskDescription: task.taskDescription,
        hours: task.hours
      }
    });

    ref.afterClosed().subscribe((result: TimesheetEntryPayload) => {
      if (result) {
        this.saveTask(result);
      }
    });
  }

  saveTask(payload: TimesheetEntryPayload): void {
    if (!this.canEdit) {
      this.toastr.error('Timesheet is locked and cannot be modified.', 'Locked');
      return;
    }

    if (this.joiningDateStr && payload.entryDate < this.joiningDateStr) {
      this.toastr.error(`Cannot log tasks prior to your official joining date (${this.joiningDateStr}).`, 'Invalid Date');
      return;
    }

    this.timesheetService.saveEntry(payload).subscribe({
      next: () => {
        this.toastr.success('Task recorded successfully.', 'Success');
        this.loadTimesheet();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to save task entry.', 'Error');
      }
    });
  }

  deleteTask(task: TimesheetTaskItem, day: TimesheetDayView, event: Event): void {
    event.stopPropagation();
    if (this.timesheetData?.status === 'Submitted') {
      this.toastr.warning('Submitted timesheets cannot be modified until reviewed.', 'Awaiting Review');
      return;
    }
    if (this.timesheetData?.status === 'Approved') {
      this.toastr.warning('Approved timesheets cannot be modified. Your manager or admin must reject it first to allow changes.', 'Timesheet Approved');
      return;
    }
    if (!this.canEdit) return;
    if (!this.isWithinBackfillWindow(day.date)) return;

    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { message: 'Are you sure you want to delete this task entry?' }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.timesheetService.deleteEntry(task.id).subscribe({
          next: () => {
            this.toastr.success('Task removed.', 'Deleted');
            this.loadTimesheet();
          },
          error: (err) => {
            this.toastr.error('Failed to delete task.', 'Error');
          }
        });
      }
    });
  }

  submitTimesheet(): void {
    if (!this.timesheetData || !this.canSubmit) return;

    if (this.timesheetData.totalTimesheetHours <= 0) {
      this.toastr.warning('Please log at least one project task before submitting.', 'Validation');
      return;
    }

    // Check if shift is currently in progress (e.g. Friday afternoon)
    const activeShiftDay = this.timesheetData.days.find((d) => d.isShiftInProgress);

    const dialogRef = this.dialog.open(TimesheetSubmitModalComponent, {
      width: '500px',
      panelClass: 'custom-clean-dialog',
      data: {
        periodType: this.periodType,
        startDate: this.formatDateString(this.currentStartDate),
        endDate: this.formatDateString(this.currentEndDate),
        totalHours: this.timesheetData.totalTimesheetHours,
        attendanceHours: this.timesheetData.totalAttendanceHours,
        managerName: this.timesheetData.managerName,
        isShiftInProgress: Boolean(activeShiftDay),
        activeShiftDate: activeShiftDay?.date
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.isSubmitting = true;
      const payload: TimesheetSubmitPayload = {
        periodType: this.periodType,
        startDate: this.formatDateString(this.currentStartDate),
        endDate: this.formatDateString(this.currentEndDate),
        estimatedActiveShiftHours: 8.5
      };

      this.timesheetService.submitPeriod(payload).subscribe({
        next: () => {
          this.toastr.success('Timesheet submitted to your manager for approval.', 'Submitted');
          this.isSubmitting = false;
          this.loadTimesheet();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Failed to submit timesheet.', 'Error');
          this.isSubmitting = false;
        }
      });
    });
  }
}
