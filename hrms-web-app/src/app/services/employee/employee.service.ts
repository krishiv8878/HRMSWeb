import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Employee/GetEmployees").pipe(
      catchError((err) => {
        console.error('Error fetching employees:', err);
        return of({ data: [] });
      })
    );
  }

  getManager(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Employee/GetManagers").pipe(
      catchError((err) => {
        console.error('Error fetching managers:', err);
        return of([]);
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/Employee/AddEmployee`, data);
  }

  updateData(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/Employee/UpdateEmployee`, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/Employee/UpdateEmployee`, data);
      })
    );
  }

  DeleteData(employeeId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/Employee/DeleteEmployee?employeeId=` + employeeId);
  }

  uploadProfileImage(employeeId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('employeeId', employeeId.toString());
    formData.append('file', file);
    return this.http.post<any>(this.apiUrl + '/Employee/UploadProfileImage', formData);
  }
}
