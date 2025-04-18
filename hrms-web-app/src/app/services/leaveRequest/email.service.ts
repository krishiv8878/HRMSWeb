import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  constructor() { }

  http = inject(HttpClient);
  apiUrl = environment.host;

  getData() {
    return this.http.get<any[]>(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`)
  }

  Leavetype(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveType/AddLeaveType`, data)
  }
  
  Leaverequest(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/LeaveRequest/AddLeaveRequest`, data, {withCredentials:true})
  }
}
