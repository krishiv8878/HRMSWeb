import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type LopCalculationBase = 'monthly_gross' | 'basic_only' | 'annual_ctc';
export type LopDivisorBasis = 'actual_days' | 'fixed_30' | 'fixed_26' | 'working_days';

export interface PayrollLopSettings {
  calculationBase: LopCalculationBase;
  divisorBasis: LopDivisorBasis;
  includeUnpaidLeaves: boolean;
  includeUnexcusedAbsents: boolean;
  customBasePercentage: number; // default: 100
}

export interface LopDayDetail {
  dateStr: string;
  formattedDate: string;
  type: 'unpaid_leave' | 'unexcused_absent';
  typeLabel: string;
  reason?: string;
}

export interface LopDetectionResult {
  unpaidLeaveDays: number;
  unexcusedAbsentDays: number;
  totalLopDays: number;
  dayDetails: LopDayDetail[];
  monthDays: number;
  workingDays: number;
  calendarMonth: number; // 0-11
  calendarYear: number;
}

const STORAGE_KEY = 'hrms_payroll_lop_settings';

const DEFAULT_SETTINGS: PayrollLopSettings = {
  calculationBase: 'monthly_gross',
  divisorBasis: 'actual_days',
  includeUnpaidLeaves: true,
  includeUnexcusedAbsents: true,
  customBasePercentage: 100
};

@Injectable({
  providedIn: 'root'
})
export class PayrollLopService {
  private settingsSubject = new BehaviorSubject<PayrollLopSettings>(this.loadSettings());
  public settings$: Observable<PayrollLopSettings> = this.settingsSubject.asObservable();

  constructor() {}

  /**
   * Get current in-memory settings snapshot
   */
  getSettings(): PayrollLopSettings {
    return this.settingsSubject.getValue();
  }

  /**
   * Save and persist settings to localStorage
   */
  saveSettings(settings: PayrollLopSettings): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    this.settingsSubject.next({ ...settings });
  }

  /**
   * Reset settings to corporate default
   */
  resetToDefault(): PayrollLopSettings {
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * Calculate per-day LOP deduction rate
   */
  calculatePerDayRate(
    grossMonthly: number,
    basicSalary: number,
    annualCtc: number,
    monthDays: number,
    workingDays: number,
    settings?: PayrollLopSettings
  ): number {
    const s = settings || this.getSettings();

    // 1. Determine base salary
    let baseAmount = grossMonthly;
    if (s.calculationBase === 'basic_only') {
      baseAmount = basicSalary > 0 ? basicSalary : grossMonthly * 0.5;
    } else if (s.calculationBase === 'annual_ctc') {
      baseAmount = annualCtc > 0 ? annualCtc / 12 : grossMonthly;
    }

    // Apply percentage modifier if configured
    if (s.customBasePercentage && s.customBasePercentage > 0 && s.customBasePercentage !== 100) {
      baseAmount = (baseAmount * s.customBasePercentage) / 100;
    }

    // 2. Determine divisor
    let divisor = monthDays > 0 ? monthDays : 30;
    switch (s.divisorBasis) {
      case 'fixed_30':
        divisor = 30;
        break;
      case 'fixed_26':
        divisor = 26;
        break;
      case 'working_days':
        divisor = workingDays > 0 ? workingDays : 22;
        break;
      case 'actual_days':
      default:
        divisor = monthDays > 0 ? monthDays : 30;
        break;
    }

    const rate = baseAmount / divisor;
    return Number(rate.toFixed(2));
  }

  /**
   * Calculate total LOP deduction amount
   */
  calculateTotalDeduction(days: number, perDayRate: number): number {
    return Math.round(Math.max(0, days) * perDayRate);
  }

  /**
   * Human-readable label for the configured calculation rule
   */
  getRuleLabel(settings?: PayrollLopSettings): string {
    const s = settings || this.getSettings();
    let baseLabel = 'Monthly Gross';
    if (s.calculationBase === 'basic_only') baseLabel = 'Basic Salary';
    if (s.calculationBase === 'annual_ctc') baseLabel = 'Annual CTC / 12';

    let divLabel = 'Actual Month Days';
    if (s.divisorBasis === 'fixed_30') divLabel = '30 Days';
    if (s.divisorBasis === 'fixed_26') divLabel = '26 Working Days';
    if (s.divisorBasis === 'working_days') divLabel = 'Working Days';

    return `${baseLabel} ÷ ${divLabel}`;
  }

  /**
   * Detect LOP days for an employee in a given month from leaves and attendance records
   */
  detectEmployeeLopDays(
    employeeId: number,
    monthYear: string,
    holidays: any[] = [],
    leaves: any[] = [],
    attendanceRecords: any[] = [],
    attendanceLogs: any[] = [],
    regularizationRequests: any[] = []
  ): LopDetectionResult {
    const s = this.getSettings();
    const { month, year } = this.parseMonthYear(monthYear);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthDays = lastDay.getDate();

    let workingDays = 0;
    const unpaidLeaveDaysList: LopDayDetail[] = [];
    const unexcusedAbsentDaysList: LopDayDetail[] = [];

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let day = 1; day <= monthDays; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = this.formatYmd(d);

      // Check if holiday
      const isHoliday = holidays.some((h: any) => {
        if (h.isActive === false || h.isActive === 0 || h.isDeleted) return false;
        const hd = h.holidayDate || h.HolidayDate;
        return hd && this.toYmdSafe(hd) === dateStr;
      });

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      // Stop absent checking for future dates in current/future months
      const isFutureDate = d > today;

      // Check if employee has approved leave on this date
      const matchedLeave = leaves.find((l: any) => {
        const empMatch = Number(l.employeeId || l.EmployeeId) === Number(employeeId);
        if (!empMatch) return false;
        const status = String(l.status || l.Status || '').toLowerCase().trim();
        if (status !== 'approved') return false;
        if (l.isDeleted === 1 || l.isDeleted === true) return false;

        const start = this.toYmdSafe(l.startDate || l.StartDate || l.fromDate || l.FromDate);
        const end = this.toYmdSafe(l.endDate || l.EndDate || l.toDate || l.ToDate) || start;
        return dateStr >= start && dateStr <= end;
      });

      if (matchedLeave) {
        // Evaluate if leave is an unpaid / LOP leave type
        const leaveTypeName = String(
          matchedLeave.leaveTypeName || matchedLeave.LeaveTypeName || matchedLeave.leaveName || matchedLeave.type || ''
        ).toLowerCase();

        const isUnpaidType =
          leaveTypeName.includes('loss of pay') ||
          leaveTypeName.includes('lop') ||
          leaveTypeName.includes('unpaid') ||
          leaveTypeName.includes('without pay');

        if (isUnpaidType && !isWeekend && !isHoliday) {
          unpaidLeaveDaysList.push({
            dateStr,
            formattedDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            type: 'unpaid_leave',
            typeLabel: 'Unpaid Leave (LOP)',
            reason: matchedLeave.leaveReason || matchedLeave.reason || 'Approved LOP'
          });
        }
        continue;
      }

      // If weekend or holiday, no absent count
      if (isWeekend || isHoliday || isFutureDate) {
        continue;
      }

      // Check if employee has attendance punches on this date
      const hasPunch = attendanceRecords.some((r: any) => {
        const empMatch = Number(r.employeeId || r.EmployeeId) === Number(employeeId);
        if (!empMatch) return false;
        const ad = r.attendanceDate || r.AttendanceDate;
        const ci = r.clockIn || r.ClockIn;
        return (ad && this.toYmdSafe(ad) === dateStr) || (ci && this.toYmdSafe(ci) === dateStr);
      });

      const hasLogPunch = attendanceLogs.some((l: any) => {
        const empMatch = Number(l.employeeId || l.EmployeeId) === Number(employeeId);
        if (!empMatch) return false;
        const ad = l.attendanceDate || l.AttendanceDate;
        const inT = l.inTime || l.InTime;
        return (ad && this.toYmdSafe(ad) === dateStr) || (inT && this.toYmdSafe(inT) === dateStr);
      });

      // Check approved regularization
      const hasApprovedRegularization = regularizationRequests.some((req: any) => {
        const empMatch = Number(req.employeeId || req.EmployeeId) === Number(employeeId);
        if (!empMatch) return false;
        const status = String(req.status || req.Status || '').toLowerCase().trim();
        if (status !== 'approved') return false;
        const rawDate = req.requestedDate || req.RequestedDate || req.attendanceDate || req.AttendanceDate;
        return rawDate && this.toYmdSafe(rawDate) === dateStr;
      });

      if (!hasPunch && !hasLogPunch && !hasApprovedRegularization) {
        unexcusedAbsentDaysList.push({
          dateStr,
          formattedDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          type: 'unexcused_absent',
          typeLabel: 'Unexcused Absence',
          reason: 'No punch recorded & no approved leave'
        });
      }
    }

    const filteredDetails: LopDayDetail[] = [];
    let unpaidCount = 0;
    let absentCount = 0;

    if (s.includeUnpaidLeaves) {
      filteredDetails.push(...unpaidLeaveDaysList);
      unpaidCount = unpaidLeaveDaysList.length;
    }

    if (s.includeUnexcusedAbsents) {
      filteredDetails.push(...unexcusedAbsentDaysList);
      absentCount = unexcusedAbsentDaysList.length;
    }

    return {
      unpaidLeaveDays: unpaidCount,
      unexcusedAbsentDays: absentCount,
      totalLopDays: unpaidCount + absentCount,
      dayDetails: filteredDetails,
      monthDays,
      workingDays: Math.max(1, workingDays),
      calendarMonth: month,
      calendarYear: year
    };
  }

  // ================= PRIVATE HELPERS =================

  private loadSettings(): PayrollLopSettings {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch (err) {
        console.warn('Failed to parse payroll LOP settings from localStorage:', err);
      }
    }
    return { ...DEFAULT_SETTINGS };
  }

  private parseMonthYear(str: string): { month: number; year: number } {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const parts = (str || '').toLowerCase().trim().split(/[\s-]+/);
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();

    for (const p of parts) {
      const idx = monthNames.indexOf(p);
      if (idx !== -1) {
        month = idx;
      } else {
        const num = Number(p);
        if (!isNaN(num) && num > 1900 && num < 2100) {
          year = num;
        }
      }
    }

    return { month, year };
  }

  private formatYmd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toYmdSafe(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') {
      const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return this.formatYmd(d);
    }
    return '';
  }
}
