import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttendanceRequestService {
  constructor() { }
    http = inject(HttpClient)
    apiUrl = environment.host
  
    getAllData() {
      return this.http.get<any[]>(this.apiUrl + `/AttendanceRequest/GetAttendanceRequests`)
    }

    createData(data : any){
      return this.http.post(this.apiUrl + `/AttendanceRequest/AddAttendanceRequest`,data)
    }
    updateData(data: any) {
      return this.http.put<any[]>(this.apiUrl + `/AttendanceRequest/UpdateAttendanceRequest`, data)
    }
  
    creatRegular(data: any) {
      return this.http.post<any[]>(this.apiUrl + `/AttendanceRequest/GetAttendanceRequests`, data,{withCredentials:true})
    }
}
