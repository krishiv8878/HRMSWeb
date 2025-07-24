import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class ResignationService {
  constructor(private tokenInterceptor : tokenInterceptor) { }
  http = inject(HttpClient)
  Api = environment.host;

  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.Api + `/Resignation/AddResignation`, data).then(response =>{ return response.data});
  }

}
