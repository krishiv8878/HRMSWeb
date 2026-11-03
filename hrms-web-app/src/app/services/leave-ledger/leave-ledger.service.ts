import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveBalanceSummary {
  leaveTypeId: number;
  leaveTypeName: string;
  totalQuota: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
  isPaid: boolean;
  accruedDays: number;
  carriedForwardDays: number;
  reservedDays: number;
  availableDays: number;
  negativeBalanceAllowed: boolean;
  negativeBalanceLimit: number;
  encashmentAllowed: boolean;
  isCompOff: boolean;
  sandwichRuleEnabled: boolean;
  maxSandwichLeavesAllowed: number;
}

export interface LeaveLedgerRecord {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  leaveType?: { type?: string; description?: string };
  transactionType: string;
  days: number;
  balanceAfter: number;
  leaveRequestId?: number;
  effectiveDate: string;
  period?: string;
  remarks?: string;
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveLedgerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/LeaveLedger`;

  getBalanceSummary(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/GetBalanceSummary/${employeeId}` : `${this.apiUrl}/GetBalanceSummary`;
    return this.http.get<any>(url);
  }

  getLedgerHistory(employeeId?: number, leaveTypeId?: number, year?: number): Observable<any> {
    const base = employeeId ? `${this.apiUrl}/GetLedgerHistory/${employeeId}` : `${this.apiUrl}/GetLedgerHistory`;
    const params: any = {};
    if (leaveTypeId) params.leaveTypeId = leaveTypeId;
    if (year) params.year = year;
    return this.http.get<any>(base, { params });
  }

  triggerAccrual(year?: number, month?: number): Observable<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return this.http.post<any>(`${this.apiUrl}/TriggerAccrual`, {}, { params });
  }

  triggerRollover(currentYear?: number, targetYear?: number): Observable<any> {
    const params: any = {};
    if (currentYear) params.currentYear = currentYear;
    if (targetYear) params.targetYear = targetYear;
    return this.http.post<any>(`${this.apiUrl}/TriggerRollover`, {}, { params });
  }
}
