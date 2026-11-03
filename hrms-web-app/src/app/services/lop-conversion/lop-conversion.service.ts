import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LopConversionItem {
  id: number;
  employeeId: number;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string };
  originalLeaveRequestId: number;
  targetLeaveTypeId: number;
  targetLeaveType?: { type?: string };
  conversionDays: number;
  fromDate: string;
  toDate: string;
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
export class LopConversionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/LopConversion`;

  getEligibleLop(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/GetEligibleLop/${employeeId}` : `${this.apiUrl}/GetEligibleLop`;
    return this.http.get<any>(url);
  }

  apply(request: Partial<LopConversionItem>): Observable<any> {
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
