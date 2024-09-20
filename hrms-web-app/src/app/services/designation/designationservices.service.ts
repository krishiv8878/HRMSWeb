import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DesignationservicesService {
  constructor() { }
  apiUrl = "http://localhost:5220/api/Designation"
  http = inject(HttpClient)

  getAlldesignation(){
   return this.http.get<any[]>(this.apiUrl + "/GetDesignations")
  }
}
