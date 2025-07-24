import { inject, Injectable } from '@angular/core';
// import { IEmployee } from '../interface/intrface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';
import { themeAlpine } from 'ag-grid-community';

@Injectable({
  providedIn: 'root'

})

export class EmployeeService {
  http = inject(HttpClient)
  apiUrl = environment.host
  constructor(private tokenInterceptor : tokenInterceptor) { }

  async getData(){
    return  await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/Employee/GetEmployees").then(response =>{ return response.data});
  }
  async getManager(){
    return  await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/Employee/GetManagers").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return  await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/Employee/AddEmployee`, data).then(response =>{ return response.data});
  }
  async updateData(data: any) {
    return  await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/Employee/UpdateEmployee/`, data).then(response =>{ return response.data});
  }
  async DeleteData(employeeId: any) {
    return  await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/Employee/DeleteEmployee?employeeId=` + employeeId).then(response =>{ return response.data});
  }
}
