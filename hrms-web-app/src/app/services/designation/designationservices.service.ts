import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class DesignationservicesService {
  constructor(private tokenInterceptor :tokenInterceptor) { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getData(){
   return this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/Designation/GetDesignations").then(response =>{ return response.data});
  }
  createData(data: any) {
    return this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/Designation/AddDesignation`, data).then(response =>{ return response.data});
  }
  updateData(data: any) {
    return this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/Designation/UpdateDesignation/`, data).then(response =>{ return response.data});
  }
  DeleteData(DesignationId: any) {
    return this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/Designation/DeleteDesignation?DesignationId=`+ DesignationId).then(response =>{ return response.data});
  }
}
