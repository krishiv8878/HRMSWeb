import { inject, Injectable } from '@angular/core';
// import { IEmployee } from '../interface/intrface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  apiUrl = "http://localhost:5220/api/Employee";
  http = inject(HttpClient)
  constructor() { }


  getAllemployee() {
    return this.http.get<any[]>(this.apiUrl + "/GetEmployees");
  }
  updateItem(id: string, data: any) {
    return this.http.put(this.apiUrl+"/UpdateEmployee", data);
  }
}
