import { inject, Injectable } from '@angular/core';
// import { IEmployee } from '../interface/intrface';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class EmployeeserviceService {
  apiUrl = "http://localhost:5220/api/Employee";
  http = inject(HttpClient)

  constructor() { }

  getAllemployee() {
    return this.http.get<any[]>(this.apiUrl + "/GetEmployees");
  }
  updateItem(id: number, updatedData: any) {
    return this.http.put(this.apiUrl+"/UpdateEmployee", updatedData);
  }
}
