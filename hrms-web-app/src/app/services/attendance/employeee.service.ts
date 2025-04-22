import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeeService {
  constructor() { }
  http = inject(HttpClient)
  apiUrl = environment.host

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + `/EmployeeAttendance/GetAll`)
  }

  createData(employeeId: number, clockIn: string | null, clockOut: string | null, totalHours: string | number | null, effectiveHours: string | number | null, attendance: string): Observable<any> {
    const requestData = {
      employeeId: employeeId,
      clockIn: clockIn,
      clockOut: clockOut,
      totalHours: totalHours,
      attendance: attendance,
      effectiveHours: effectiveHours
    };
    console.log("Sending API Request:", requestData);

    return this.http.post(this.apiUrl + `/EmployeeAttendance/AddEmployeeAttendanceRequest`, requestData)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/EmployeeAttendance/UpdateEmployeeAttendanceRequest`, data)
  }

  creatRegular(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/EmployeeAttendance/AddRegularizationRequest`, data)
  }
}
