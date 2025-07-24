import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';
import axios, { Axios } from 'axios';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() { }
  http = inject(HttpClient)
  apiUrl = environment.host

  async createLogin(data: any) {
    return await axios.post(this.apiUrl + `/UserLogin/Login?email=${data.email}&password=${data.password}`, data, { withCredentials: true }).then(data => {
      return data.data;
    })
  }
       
  async createRegister(data: any) {
    return await axios.post(this.apiUrl + `/UserRegistration/Registration`, data).then(response =>{ return response.data});
  }

  async resetPassword(data: any) {
    return await axios.post(this.apiUrl + `/UserLogin/forgot-password`, data).then(response =>{ return response.data});
  }

  async forgotpassword(data: any) {
    return await axios.post(this.apiUrl + `/UserLogin/reset-password`, data).then(response =>{ return response.data});
  }
}
