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
<<<<<<< HEAD
  createData(employeeId: number, clockIn: string | null, clockOut: string | null, totalHours: string | number | null, attendance: string): Observable<any> {
    const requestData = {
      employeeId: employeeId,
      clockIn: clockIn,
      clockOut: clockOut,
      totalHours: totalHours,
      attendance: attendance
    };
    console.log("Sending API Request:", requestData);
=======
  createData(employeeId: number, action: 'start' | 'stop'): Observable<any> {
    const requestData = {
      employeeId: employeeId,
      action: action,
      timestamp: new Date().toISOString()
    };
>>>>>>> 4a122dd (create employeeattendance)
    return this.http.post(this.apiUrl + `/EmployeeAttendance/AddEmployeeAttendanceRequest`, requestData)
  }
}
