import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeavetypeService {
  http = inject(HttpClient);
  apiUrl = environment.host;
  constructor() { }

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + "/LeaveType/GetLeaveType");
  }

  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveType/AddLeaveType`, data);
  }

  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/LeaveType/UpdateLeaveType/`, data);
  }

  DeleteData(LeaveTypeId: any) {
    const numericId = Number(LeaveTypeId || 0);
    return this.http.delete(this.apiUrl + `/LeaveType/DeleteLeaveType?id=` + numericId);
  }
}
