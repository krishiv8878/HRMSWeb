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


  getData() {
    return this.http.get<any[]>(this.apiUrl + "/Employee/GetEmployees");
  }
  updateItem(id: string, data: any) {
    return this.http.put(this.apiUrl+"/Employee/UpdateEmployee", data);
  }
}
