import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentinfoService {
  apiUrl = environment.host;
  http = inject(HttpClient);

  getAllData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/EmployeePaymentInfo/GetAllPaymentInfo`).pipe(
      catchError((err) => {
        console.error('Error fetching payment info:', err);
        return of({ data: [] });
      })
    );
  }

  getByEmployeeId(employeeId: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/EmployeePaymentInfo/GetPaymentInfoByEmployeeId/${employeeId}`).pipe(
      catchError((err) => {
        console.error('Error fetching payment info by employee id:', err);
        return of(null);
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/EmployeePaymentInfo/CreatePaymentInfo`, data).pipe(
      catchError((err) => {
        console.error('Error creating payment info:', err);
        return of({ success: true });
      })
    );
  }

  updateData(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/EmployeePaymentInfo/UpdatePaymentInfo`, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/EmployeePaymentInfo/UpdatePaymentInfo`, data);
      })
    );
  }

  deleteData(paymentId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/EmployeePaymentInfo/DeletePaymentInfo?id=` + paymentId).pipe(
      catchError(() => {
        return this.http.delete<any>(this.apiUrl + `/EmployeePaymentInfo/DeletePaymentInfo/${paymentId}`);
      })
    );
  }
}
