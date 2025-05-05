import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

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
  creatDocument(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/EmployeeDocument/UploadDocument`, data)
  }
  viewDocument(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/EmployeeDocument/view/${id}`, { responseType: 'blob' });
  }

}
