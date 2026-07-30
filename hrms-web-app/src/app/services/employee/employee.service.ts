import { inject, Injectable } from '@angular/core';
// import { IEmployee } from '../interface/intrface';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'

})

export class EmployeeService {
  http = inject(HttpClient)
  apiUrl = environment.host
  constructor() { }

  getData(){
    return  this.http.get<any[]>(this.apiUrl + "/Employee/GetEmployees");
  }
  getManager(){
    return  this.http.get<any[]>(this.apiUrl + "/Employee/GetManagers");
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Employee/AddEmployee`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Employee/UpdateEmployee/`, data);
  }
  DeleteData(employeeId: any) {
    return this.http.delete(this.apiUrl + `/Employee/DeleteEmployee?employeeId=` + employeeId);
  }
  uploadProfileImage(employeeId: number, file: File) {
    const formData = new FormData();
    formData.append('employeeId', employeeId.toString());
    formData.append('file', file);
    return this.http.post<any>(this.apiUrl + '/Employee/UploadProfileImage',formData);
  }
}
