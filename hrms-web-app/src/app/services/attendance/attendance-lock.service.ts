import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface AttendanceLockDTO {
  id: number;
  month: number;
  year: number;
  totalEmployeesLocked: number;
  totalPresentDays: number;
  totalLopDays: number;
  totalOvertimeHours: number;
  isLocked: boolean;
  lockedByEmployeeId: number;
  lockedByEmployeeName: string;
  lockedDate: string;
  unlockedReason?: string;
  unlockedByEmployeeId?: number;
  unlockedByEmployeeName?: string;
  unlockedDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceLockService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  getAllLocks(): Observable<{ statusCode: number; message: string; data: AttendanceLockDTO[] }> {
    return this.http.get<any>(`${this.apiUrl}/AttendanceLock/GetAllLocks`, { withCredentials: true });
  }

  getLockForMonth(month: number, year: number): Observable<{ statusCode: number; message: string; data: AttendanceLockDTO | null }> {
    return this.http.get<any>(`${this.apiUrl}/AttendanceLock/GetLockForMonth?month=${month}&year=${year}`, { withCredentials: true });
  }

  lockMonth(month: number, year: number): Observable<{ statusCode: number; message: string; data: AttendanceLockDTO }> {
    return this.http.post<any>(`${this.apiUrl}/AttendanceLock/LockMonth`, { month, year }, { withCredentials: true });
  }

  unlockMonth(month: number, year: number, reason: string): Observable<{ statusCode: number; message: string; data: AttendanceLockDTO }> {
    return this.http.post<any>(`${this.apiUrl}/AttendanceLock/UnlockMonth`, { month, year, reason }, { withCredentials: true });
  }
}
