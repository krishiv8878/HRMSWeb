import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor() { }

  http = inject(HttpClient)
  apiUrl = environment.host;

  getAll() {
    return this.http.get<any[]>(this.apiUrl + `/EmployeeDocument/GetAllDocumentsInfo`)
  }
  creatDocument(formData: FormData): Observable<any> {
    const documentName = formData.get('documentName') as string;
    return this.http.post<any[]>(this.apiUrl + `/EmployeeDocument/UploadDocument?documentName=${encodeURIComponent(documentName)}`, formData).pipe(
      tap(() => console.log(' API called')),
      catchError((error) => {
        console.error(' Error from API service:', error);
        return throwError(() => error);
      })
    )
  }
  viewDocument(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/EmployeeDocument/view/${id}`, { responseType: 'blob' });
  }

}
