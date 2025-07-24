import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';
import { response } from 'express';
import { resolve } from 'path';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor(private tokenInterceptor: tokenInterceptor) { }

  http = inject(HttpClient)
  apiUrl = environment.host;

  async getAll() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + `/EmployeeDocument/GetAllDocumentsInfo`).then(response =>{ return response.data});
  }
  async creatDocument(formData: FormData): Promise<Observable<any>> {
    const documentName = formData.get('documentName') as string;
    // debugger
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/EmployeeDocument/UploadDocument?documentName=${encodeURIComponent(documentName)}`, formData).then(
      response=>{
        console.log(' API called');
        return response.data
      }).catch(error => {
        console.error(' Error from API service:', error);
        return throwError(() => error);
      });
  }
  async viewDocument(id: number): Promise<Observable<any>> {
    return await this.tokenInterceptor.getAxiosInstance().get(`${this.apiUrl}/EmployeeDocument/view/${id}`, { responseType: 'blob' }).then(response =>{ return response.data});
  }

}
