import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() { }
  http = inject(HttpClient)
  apiUrl = environment.host

  createLogin(data: any) {
    return this.http.post<any>(this.apiUrl + `/UserLogin/Login?email=${data.email}&password=${data.password}`, data, { withCredentials: true }).pipe(map(data => {
      return data;
    }))
  }
       
  createRegister(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/UserRegistration/Registration`, data)
  }

  resetPassword(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/UserLogin/forgot-password`, data)
  }

  forgotpassword(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/UserLogin/reset-password`, data)
  }
}
