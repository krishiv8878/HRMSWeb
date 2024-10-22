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

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + "/Employee/GetEmployees");
  } 
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Employee/AddEmployee`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Employee/UpdateEmployee/`, data);
  }
  DeleteData(employeeId: any) {
    return this.http.delete(this.apiUrl + `/Employee/DeleteEmployee?employeeId=`+ employeeId);
  }
}
