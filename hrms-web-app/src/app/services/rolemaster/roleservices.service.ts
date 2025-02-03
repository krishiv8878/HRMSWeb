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
    return this.http.get<any[]>(this.apiUrl + "/roleMaster/GetroleMaster");
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/roleMaster/AddroleMaster`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/roleMaster/UpdateroleMaster/`, data);
  }
  DeleteData(roleMasterId: any) {
    return this.http.delete(this.apiUrl + `/roleMaster/DeleteroleMaster?roleMasterId=` + roleMasterId);
  }
}
