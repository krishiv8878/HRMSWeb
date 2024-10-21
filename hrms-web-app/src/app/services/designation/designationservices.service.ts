import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DesignationservicesService {
  constructor() { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getData(){
   return this.http.get<any[]>(this.apiUrl + "/Designation/GetDesignations")
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Designation/AddDesignation`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Designation/UpdateDesignation/`, data);
  }
  DeleteData(DesignationId: any) {
    return this.http.delete(this.apiUrl + `/Designation/DeleteDesignation?DesignationId=`+ DesignationId);
  }
}
