import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  constructor() { }

  http = inject(HttpClient);
  apiUrl = environment.host;

  getData() {
    return this.http.get<any[]>(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`);
  }

  Leavetype(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveType/AddLeaveType`, data);
  }

  Leaverequest(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveRequest/AddLeaveRequest`, data);
  }

  approveLeaveRequest(body: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveRequest/ApproveLeaveRequest`, body);
  }

  UpdateLeaverequest(data: any) {
    const numericId = Number(data.id || data.leaveRequestId || 0);

    const body = {
      id: numericId,
      leaveRequestId: numericId,
      employeeId: Number(data.employeeId || 1),
      leaveTypeId: Number(data.leaveTypeId) || 1,
      leaveMode: data.leaveMode || 'Full Day',
      startDate: data.startDate,
      endDate: data.endDate,
      leaveReason: data.leaveReason || '',
      status: data.status || 'Pending',
      isApproved: Boolean(data.isApproved),
      approvedBy: Number(data.approvedBy) || 0,
      isActive: data.isActive !== false && data.isActive !== 0 && data.isActive !== '0',
      isDeleted: Boolean(data.isDeleted)
    };

    const wrappedBody = {
      leaveRequest: body,
      ...body
    };

    return this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, body).pipe(
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, wrappedBody)),
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest`, body)),
      catchError(() => this.http.post<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest`, body)),
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/EditLeaveRequest`, body)),
      catchError((err) => {
        console.error('UpdateLeaverequest API fallback:', err);
        return of(body);
      })
    );
  }

  GetAllEmployeesLeaveRequest() {
    return this.http.get<any[]>(this.apiUrl + `/LeaveRequest/GetAllEmployeesLeaveRequest`);
  }

  getAllData() {
    return this.GetAllEmployeesLeaveRequest();
  }

  DeleteData(ProjectMasterId: any) {
    const numericId = Number(ProjectMasterId || 0);
    const body = {
      id: numericId,
      leaveRequestId: numericId,
      isActive: false,
      isDeleted: true
    };
    return this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, body).pipe(
      catchError(() => of(null))
    );
  }
}
