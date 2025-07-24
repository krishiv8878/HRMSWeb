import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  constructor(private tokenInterceptor : tokenInterceptor) { }

  http = inject(HttpClient);
  apiUrl = environment.host;

  async getData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + `/LeaveRequest/GetAllLeaveRequest`).then(response =>{ return response.data});
  }

  async Leavetype(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/LeaveType/AddLeaveType`, data).then(response =>{ return response.data});
  }
  
  async Leaverequest(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/LeaveRequest/AddLeaveRequest`, data, {withCredentials:true}).then(response =>{ return response.data});
  }
}
