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
      ...data,
      id: numericId,
      leaveRequestId: numericId,
      leaveTypeId: Number(data.leaveTypeId) || 1,
      isActive: data.isActive !== false && data.isActive !== 0 && data.isActive !== '0',
      isDeleted: data.isDeleted === true || data.isDeleted === 1 || data.isDeleted === '1'
    };

    const wrappedBody = {
      leaveRequest: body,
      ...body
    };

    return this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, body).pipe(
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest/${numericId}`, wrappedBody)),
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest`, body)),
      catchError(() => this.http.put<any>(this.apiUrl + `/LeaveRequest/UpdateLeaveRequest?id=${numericId}`, body)),
      catchError((err) => {
        console.error('UpdateLeaverequest error:', err);
        return of(null);
      })
    );
  }

  GetAllEmployeesLeaveRequest() {
    return this.http.get<any[]>(this.apiUrl + `/LeaveRequest/GetAllEmployeesLeaveRequest`);
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
