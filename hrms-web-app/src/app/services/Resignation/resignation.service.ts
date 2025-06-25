import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResignationService {
  constructor() { }
  http = inject(HttpClient)
  Api = environment.host;

  createData(data: any) {
    return this.http.post<any[]>(this.Api + `/Resignation/AddResignation`, data)
  }

}
