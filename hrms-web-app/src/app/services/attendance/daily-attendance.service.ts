import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface DailyAttendanceRecordDTO {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  shiftId?: number;
  shiftName: string;
  firstClockIn?: string;
  lastClockOut?: string;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  effectiveWorkMinutes: number;
  overtimeMinutes: number;
  lateArrivalMinutes: number;
  earlyExitMinutes: number;
  status: 'Present' | 'HalfDay' | 'Absent' | 'Late' | 'OnLeave' | 'Holiday' | 'WeekOff' | 'WFH' | 'MissedPunch' | string;
  leaveRequestId?: number;
  isRegularized: boolean;
  attendanceLockId?: number;
  remarks?: string;
}

export interface AttendanceMonthlySummaryDTO {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
  totalDaysInMonth: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  lateMarksCount: number;
  latePenaltyDays: number;
  onLeaveDays: number;
  weekOffDays: number;
  holidayDays: number;
  totalEffectiveHours: number;
  isMonthLocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DailyAttendanceService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  getDailyRecords(employeeId: number | null, month: number, year: number): Observable<{ statusCode: number; message: string; data: DailyAttendanceRecordDTO[] }> {
    let url = `${this.apiUrl}/DailyAttendance/GetDailyRecords?month=${month}&year=${year}`;
    if (employeeId && employeeId > 0) {
      url += `&employeeId=${employeeId}`;
    }
    return this.http.get<any>(url, { withCredentials: true });
  }

  getMonthlySummary(employeeId: number, month: number, year: number): Observable<{ statusCode: number; message: string; data: AttendanceMonthlySummaryDTO }> {
    return this.http.get<any>(`${this.apiUrl}/DailyAttendance/GetMonthlySummary?employeeId=${employeeId}&month=${month}&year=${year}`, { withCredentials: true });
  }

  triggerDailyComputation(request: { targetDate?: string; fromDate?: string; toDate?: string; employeeId?: number }): Observable<{ statusCode: number; message: string; data: number }> {
    return this.http.post<any>(`${this.apiUrl}/DailyAttendance/TriggerDailyComputation`, request, { withCredentials: true });
  }
}
