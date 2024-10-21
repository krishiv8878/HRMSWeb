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

  getHoliday(){
    return this.http.get<any[]>(this.apiUrl + "/Holiday/GetHolidays")
  }

  createHoliday(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Holiday/AddHoliday/`, data)
  }

  updateHoliday(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Holiday/UpdateHoliday/`, data);
  }

  DeleteHoliday(holidayId: any) {
    return this.http.delete(this.apiUrl + `/Holiday/DeleteHoliday?holidayId=`+ holidayId);
  }
}
