import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeeService {
  constructor(private tokenInterceptor : tokenInterceptor) { }
  http = inject(HttpClient)
  apiUrl = environment.host

  async getAllData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + `/EmployeeAttendance/GetAll`).then(response =>{ return response.data});
  }

  async createData(employeeId: number, clockIn: string | null, clockOut: string | null, totalHours: string | number | null, effectiveHours: string | number | null, attendance: string): Promise<Observable<any>> {
    const requestData = {
      employeeId: employeeId,
      clockIn: clockIn,
      clockOut: clockOut,
      totalHours: totalHours,
      attendance: attendance,
      effectiveHours: effectiveHours
    };
    console.log("Sending API Request:", requestData);

    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/EmployeeAttendance/AddEmployeeAttendanceRequest`, requestData).then(response =>{ return response.data});
  }
  async updateData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/EmployeeAttendance/UpdateEmployeeAttendanceRequest`, data).then(response =>{ return response.data});
  }

  async creatRegular(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/EmployeeAttendance/AddRegularizationRequest`, data,{withCredentials:true}).then(response =>{ return response.data});
  }
}
