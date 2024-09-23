import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HolidayservicesService {
  constructor() { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getData(){
    return this.http.get<any[]>(this.apiUrl + "/Holiday/GetHolidays")
  }
}
