import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentinfoService {
  apiUrl = environment.host;
  http = inject(HttpClient)
  constructor() { }

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + `/EmployeePaymentInfo/GetAllPaymentInfo`)
  }

  createData(data: any): Observable<any> {
    return this.http.post<any[]>(this.apiUrl + `/EmployeePaymentInfo/CreatePaymentInfo`, data,{withCredentials:true})
  }

  updateData(data: any) {
    return this.http.put(this.apiUrl + `/EmployeePaymentInfo/UpdatePaymentInfo/`, data)
  }

  deleteData(paymentId: any) {
    return this.http.delete<any[]>(this.apiUrl + `/EmployeePaymentInfo/DeletePaymentInfo?id=` + paymentId)
  }
}
