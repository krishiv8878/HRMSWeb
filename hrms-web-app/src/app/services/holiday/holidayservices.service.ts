import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class HolidayservicesService {
  constructor(private tokenInterceptor :tokenInterceptor) { }
  apiUrl = environment.host
  http = inject(HttpClient)

  async getHoliday(){
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/Holiday/GetHolidays").then(response =>{ return response.data});
  }

  async createHoliday(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/Holiday/AddHoliday/`, data).then(response =>{ return response.data});
  }

  async updateHoliday(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/Holiday/UpdateHoliday/`, data).then(response =>{ return response.data});
  }

  async DeleteHoliday(holidayId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/Holiday/DeleteHoliday?holidayId=`+ holidayId).then(response =>{ return response.data});
  }
}
