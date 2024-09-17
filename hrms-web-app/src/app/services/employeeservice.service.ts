import { Injectable } from '@angular/core';
import { IEmployee } from '../interface/intrface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EmployeeserviceService {

  private apiUrl = "http://localhost:5220";

  constructor(private http: HttpClient) { }

  getAllemployee() {
    return this.http.get<IEmployee[]>(this.apiUrl + "/api/Employee/GetEmployees");
  }
}
