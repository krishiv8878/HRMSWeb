import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface AttendanceReportItem {
  employeeId: number;
  employeeName: string;
  department: string;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalHolidays: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
  totalEffectiveHours: number;
}

export interface LeaveBalanceReportItem {
  employeeId: number;
  employeeName: string;
  department: string;
  leaveTypeId: number;
  leaveTypeName: string;
  totalAllocated: number;
  used: number;
  pending: number;
  availableBalance: number;
}

export interface PayrollReconciliationReportItem {
  employeeId: number;
  employeeName: string;
  department: string;
  payRunId?: number;
  payPeriod: string;
  basicPay: number;
  allowances: number;
  grossPay: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  taxDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
}

export interface HeadcountDemographicsReport {
  totalActiveEmployees: number;
  byDepartment: { [key: string]: number };
  byEmploymentType: { [key: string]: number };
  byGender: { [key: string]: number };
  byLocation: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Reports`;

  getAttendanceSummary(month?: number, year?: number, department?: string): Observable<any> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (department && department !== 'All') params = params.set('department', department);
    return this.http.get<any>(`${this.apiUrl}/attendance`, { params });
  }

  exportAttendanceSummary(month?: number, year?: number, department?: string): Observable<Blob> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (department && department !== 'All') params = params.set('department', department);
    return this.http.get(`${this.apiUrl}/attendance/export`, { params, responseType: 'blob' });
  }

  getLeaveBalance(department?: string, leaveTypeId?: number): Observable<any> {
    let params = new HttpParams();
    if (department && department !== 'All') params = params.set('department', department);
    if (leaveTypeId) params = params.set('leaveTypeId', leaveTypeId.toString());
    return this.http.get<any>(`${this.apiUrl}/leave-balance`, { params });
  }

  exportLeaveBalance(department?: string, leaveTypeId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (department && department !== 'All') params = params.set('department', department);
    if (leaveTypeId) params = params.set('leaveTypeId', leaveTypeId.toString());
    return this.http.get(`${this.apiUrl}/leave-balance/export`, { params, responseType: 'blob' });
  }

  getPayrollReconciliation(payRunId?: number, month?: number, year?: number, department?: string): Observable<any> {
    let params = new HttpParams();
    if (payRunId) params = params.set('payRunId', payRunId.toString());
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (department && department !== 'All') params = params.set('department', department);
    return this.http.get<any>(`${this.apiUrl}/payroll-reconciliation`, { params });
  }

  exportPayrollReconciliation(payRunId?: number, month?: number, year?: number, department?: string): Observable<Blob> {
    let params = new HttpParams();
    if (payRunId) params = params.set('payRunId', payRunId.toString());
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (department && department !== 'All') params = params.set('department', department);
    return this.http.get(`${this.apiUrl}/payroll-reconciliation/export`, { params, responseType: 'blob' });
  }

  getHeadcountDemographics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/headcount-demographics`);
  }

  exportHeadcountDemographics(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/headcount-demographics/export`, { responseType: 'blob' });
  }
}
