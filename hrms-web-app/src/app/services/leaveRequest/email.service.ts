import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { catchError, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  getData(): Observable<any> {
    const role = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('RoleType') || localStorage.getItem('roleType') || localStorage.getItem('role') || localStorage.getItem('Role') || '')
      : '';
    const isApprover = /admin|hr|manager|management/i.test(role);
    const endpoint = isApprover ? `/LeaveRequest/GetAllEmployeesLeaveRequest` : `/LeaveRequest/GetAllLeaveRequest`;

    return this.http.get<any>(this.apiUrl + endpoint).pipe(
      catchError(() => {
        return this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`).pipe(
          catchError((err) => {
            console.error('Error fetching leave requests from API:', err);
            return of({ data: [] });
          })
        );
      })
    );
  }

  getAllEmployeesLeaveRequest(): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllEmployeesLeaveRequest`).pipe(
      catchError((err) => {
        console.error('Error fetching all employees leave requests:', err);
        return of({ data: [] });
      })
    );
  }

  Leavetype(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/LeaveType/AddLeaveType`, data);
  }

  Leaverequest(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/LeaveRequest/AddLeaveRequest`, data).pipe(
      catchError((err) => {
        console.error('Error creating leave request:', err);
        throw err;
      })
    );
  }

  approveLeaveRequest(body: any): Observable<any> {
    const payload = {
      id: Number(body.id || body.leaveRequestId || 0),
      status: body.status || 'Approved',
      actionBy: Number(body.actionBy || 0),
      rejectionReason: body.rejectionReason || ''
    };
    return this.http.post<any>(this.apiUrl + `/LeaveRequest/ApproveLeaveRequest`, payload);
  }

  getEmployeeLeaveBalance(employeeId?: number): Observable<any> {
    const param = employeeId ? `/${employeeId}` : '';
    return this.http.get<any>(this.apiUrl + `/LeaveRequest/GetEmployeeLeaveBalance${param}`).pipe(
      catchError((err) => {
        console.error('Error fetching employee leave balances:', err);
        return of({ data: [] });
      })
    );
  }

  private formatDateOnly(dateVal: any): string {
    if (!dateVal) return new Date().toISOString();
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toISOString();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}T12:00:00`;
  }

  UpdateLeaverequest(data: any): Observable<any> {
    const numericId = Number(data.id || data.leaveRequestId || 0);

    const body = {
      id: numericId,
      leaveRequestId: numericId,
      employeeId: Number(data.employeeId || 1),
      leaveTypeId: Number(data.leaveTypeId) || 1,
      leaveMode: data.leaveMode || 'Full Day',
      startDate: this.formatDateOnly(data.startDate),
      endDate: this.formatDateOnly(data.endDate),
      leaveReason: data.leaveReason || '',
      status: data.status || 'Pending',
      actionBy: Number(data.actionBy || 0),
      actionDate: data.actionDate || null,
      rejectionReason: data.rejectionReason || '',
      isActive: data.isActive !== false && data.isActive !== 0 && data.isActive !== '0',
      isDeleted: Boolean(data.isDeleted)
    };

    return this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, body);
  }

  GetAllEmployeesLeaveRequest(): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllEmployeesLeaveRequest`).pipe(
      catchError(() => this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`)),
      catchError((err) => {
        console.error('Error fetching all employees leave requests:', err);
        return of({ data: [] });
      })
    );
  }

  getAllData(): Observable<any> {
    return this.GetAllEmployeesLeaveRequest();
  }

  DeleteData(leaveRequestId: any): Observable<any> {
    const numericId = Number(leaveRequestId || 0);
    return this.http.delete<any>(this.apiUrl + `/LeaveRequest/DeleteLeaveRequest/${numericId}`).pipe(
      catchError(() => this.http.delete<any>(this.apiUrl + `/LeaveRequest/DeleteLeaveRequest?id=${numericId}`)),
      catchError(() => {
        const body = { id: numericId, leaveRequestId: numericId, isActive: false, isDeleted: true };
        return this.UpdateLeaverequest(body);
      })
    );
  }

  cancelLeave(leaveRequestId: number, reason?: string): Observable<any> {
    const payload = {
      leaveRequestId: Number(leaveRequestId),
      reason: reason || 'Cancelled by Employee'
    };
    return this.http.post<any>(this.apiUrl + `/LeaveRequest/CancelLeaveRequest`, payload);
  }

  /**
   * Calculates the actual working leave days between two dates,
   * strictly ignoring weekends (Saturday, Sunday) and official company holidays.
   */
  calculateWorkingLeaveDays(
    startDateStr?: string | Date,
    endDateStr?: string | Date,
    leaveMode: string = 'Full Day',
    holidays: any[] = []
  ): number {
    if (!startDateStr || !endDateStr) return 0;

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

    const holidaySet = new Set<string>();
    if (Array.isArray(holidays)) {
      for (const h of holidays) {
        if (h.isActive === false || h.isActive === 0 || h.isDeleted) continue;
        const hd = h.holidayDate || h.HolidayDate;
        if (hd) {
          const dateOnly = String(hd).slice(0, 10);
          holidaySet.add(dateOnly);
        }
      }
    }

    const isHalfDay = leaveMode ? leaveMode.toLowerCase().includes('half') : false;
    let workingDays = 0;

    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(0, 0, 0, 0);

    while (cur <= endNorm) {
      const dayOfWeek = cur.getDay(); // 0 is Sunday, 6 is Saturday
      const y = cur.getFullYear();
      const m = (cur.getMonth() + 1).toString().padStart(2, '0');
      const d = cur.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      // Ignore Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Ignore official holidays
        if (!holidaySet.has(dateStr)) {
          workingDays += isHalfDay ? 0.5 : 1.0;
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    return workingDays;
  }
}
