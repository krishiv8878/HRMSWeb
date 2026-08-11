import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DesignationservicesService {
  apiUrl = environment.host;
  http = inject(HttpClient);

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Designation/GetDesignations").pipe(
      catchError((err) => {
        console.error('Error fetching designations:', err);
        return of({ data: [] });
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/Designation/AddDesignation`, data);
  }

  updateData(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/Designation/UpdateDesignation`, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/Designation/UpdateDesignation`, data);
      })
    );
  }

  DeleteData(DesignationId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/Designation/DeleteDesignation?DesignationId=` + DesignationId);
  }
}
