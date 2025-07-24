import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentinfoService {
  apiUrl = environment.host;
  http = inject(HttpClient)
  constructor(private tokenInterceptor : tokenInterceptor) { }

  async getAllData() {
    return await this.tokenInterceptor.getAxiosInstance().get<any[]>(this.apiUrl + `/EmployeePaymentInfo/GetAllPaymentInfo`).then(response =>{ return response.data});
  }

  async createData(data: any): Promise<Observable<any>> {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/EmployeePaymentInfo/CreatePaymentInfo`, data,{withCredentials:true}).then(response =>{ return response.data});
  }

  async updateData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/EmployeePaymentInfo/UpdatePaymentInfo/`, data).then(response =>{ return response.data});
  }

  async deleteData(paymentId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/EmployeePaymentInfo/DeletePaymentInfo?id=` + paymentId).then(response =>{ return response.data});
  }
}
