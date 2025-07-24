import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class LeavetypeService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor(private tokenInterceptor : tokenInterceptor) { }

  async getAllData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/LeaveType/GetLeaveType").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/LeaveType/AddLeaveType`, data).then(response =>{ return response.data});
  }
  async updateData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/LeaveType/UpdateLeaveType/` , data).then(response =>{ return response.data});
  }
  async DeleteData(LeaveTypeId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/LeaveType/DeleteLeaveType?LeaveTypeId=` + LeaveTypeId).then(response =>{ return response.data});
  }
}
