import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleservicesService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor() { }

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + "/RoleMaster/GetRoles");
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/RoleMaster/AddRole`, data)
  }
  updateData(data: any, RoleId:any) {
    return this.http.put<any[]>(this.apiUrl + `/RoleMaster/UpdateRole/`+RoleId, data);
  }
  DeleteData(RoleMasterId: any) {
    return this.http.delete(this.apiUrl + `/RoleMaster/DeleteRole/` + RoleMasterId);
  }
}
