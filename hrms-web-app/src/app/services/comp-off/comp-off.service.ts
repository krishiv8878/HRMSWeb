import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompOffEligibleDate {
  attendanceDate: string;
  dayType: string;
  holidayName?: string;
  workedMinutes: number;
  eligibleDays: number;
  alreadyRequested: boolean;
  requestStatus?: string;
}

export interface CompOffGrantItem {
  id: number;
  employeeId: number;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string };
  attendanceDate: string;
  workedMinutes: number;
  eligibleDays: number;
  reason: string;
  status: string;
  actionBy?: number;
  actionDate?: string;
  rejectionReason?: string;
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompOffService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/CompOff`;

  getEligibleDates(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/GetEligibleDates/${employeeId}` : `${this.apiUrl}/GetEligibleDates`;
    return this.http.get<any>(url);
  }

  apply(request: Partial<CompOffGrantItem>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Apply`, request);
  }

  getAll(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/GetAll`);
  }

  approve(requestId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Approve`, { requestId });
  }

  reject(requestId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Reject`, { requestId, reason });
  }
}
