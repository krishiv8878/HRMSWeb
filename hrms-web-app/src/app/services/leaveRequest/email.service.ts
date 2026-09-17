import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`).pipe(
      catchError(() => this.http.get<any>(this.apiUrl + `/LeaveRequest/GetAllEmployeesLeaveRequest`)),
      catchError(() => this.http.get<any>(this.apiUrl + `/LeaveRequest/GetLeaveRequests`)),
      catchError((err) => {
        console.error('Error fetching leave requests from API:', err);
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
    return this.http.post<any>(this.apiUrl + `/LeaveRequest/ApproveLeaveRequest`, payload).pipe(
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/ApproveLeaveRequest`, payload))
    );
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

  UpdateLeaverequest(data: any): Observable<any> {
    const numericId = Number(data.id || data.leaveRequestId || 0);

    const body = {
      id: numericId,
      leaveRequestId: numericId,
      employeeId: Number(data.employeeId || 1),
      leaveTypeId: Number(data.leaveTypeId) || 1,
      leaveMode: data.leaveMode || 'Full Day',
      startDate: data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : new Date().toISOString(),
      leaveReason: data.leaveReason || '',
      status: data.status || 'Pending',
      actionBy: Number(data.actionBy || 0),
      actionDate: data.actionDate || null,
      rejectionReason: data.rejectionReason || '',
      isActive: data.isActive !== false && data.isActive !== 0 && data.isActive !== '0',
      isDeleted: Boolean(data.isDeleted)
    };

    return this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, body).pipe(
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest`, body)),
      catchError(() => this.http.post<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest`, body)),
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/EditLeaveRequest`, body)),
      catchError((err) => {
        console.error('UpdateLeaverequest API error:', err);
        return of(body);
      })
    );
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
}
