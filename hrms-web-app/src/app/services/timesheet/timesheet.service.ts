import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TimesheetView,
  TimesheetEntryPayload,
  TimesheetSubmitPayload,
  TimesheetApprovalPayload
} from '../../interface/timesheet.interface';

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  getMyTimesheet(startDate: string, endDate: string): Observable<TimesheetView> {
    const employeeId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId') || 0) : 0;
    return this.http.get<any>(
      `${this.apiUrl}/Timesheet/GetMyTimesheet?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`
    ).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  saveEntry(payload: TimesheetEntryPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Timesheet/SaveEntry`, payload).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  deleteEntry(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/Timesheet/DeleteEntry/${id}`).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  submitPeriod(payload: TimesheetSubmitPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Timesheet/SubmitPeriod`, payload).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  getPendingApprovals(): Observable<TimesheetView[]> {
    return this.http.get<any>(`${this.apiUrl}/Timesheet/GetPendingApprovals`).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  approveOrReject(payload: TimesheetApprovalPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Timesheet/ApproveOrReject`, payload).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }
}
