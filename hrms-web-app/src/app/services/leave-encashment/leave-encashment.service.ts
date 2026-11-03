import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EncashmentEligibility {
  leaveTypeId: number;
  leaveTypeName: string;
  encashmentAllowed: boolean;
  availableBalance: number;
  minBalanceRequired: number;
  maxEncashmentDays: number;
  dailySalaryBasis: number;
  isEligible: boolean;
  ineligibilityReason: string;
}

export interface EncashmentRequestItem {
  id: number;
  employeeId: number;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string };
  leaveTypeId: number;
  leaveType?: { type?: string };
  requestedDays: number;
  dailySalaryBasis: number;
  estimatedAmount: number;
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
export class LeaveEncashmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/LeaveEncashment`;

  getEligibility(leaveTypeId: number, employeeId?: number): Observable<any> {
    const params: any = {};
    if (employeeId) params.employeeId = employeeId;
    return this.http.get<any>(`${this.apiUrl}/GetEligibility/${leaveTypeId}`, { params });
  }

  apply(request: Partial<EncashmentRequestItem>): Observable<any> {
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
