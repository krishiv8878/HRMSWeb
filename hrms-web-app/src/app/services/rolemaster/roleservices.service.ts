import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class RoleservicesService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor(private tokenInterceptor : tokenInterceptor) { }

  async getAllData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/RoleMaster/GetRoles").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/RoleMaster/AddRole`, data).then(response =>{ return response.data});
  }
  async updateData(data: any, RoleId:any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/RoleMaster/UpdateRole/`+RoleId, data).then(response =>{ return response.data});
  }
  async DeleteData(RoleMasterId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/RoleMaster/DeleteRole/` + RoleMasterId).then(response =>{ return response.data});
  }
}
