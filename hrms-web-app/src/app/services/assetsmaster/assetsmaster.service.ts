import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class AssetsmasterService {
  constructor(private tokenInterceptor : tokenInterceptor) { }
  apiUrl = environment.host
  http = inject(HttpClient)

  async getData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/AssetsMaster/GetAssetsMaster").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/AssetsMaster/AddAssetsMaster`, data).then(response =>{ return response.data});
  }
  async updateData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/AssetsMaster/UpdateAssetsMaster/`, data).then(response =>{ return response.data});
  }
  async DeleteData(AssetsMasterId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/AssetsMaster/DeleteAssetsMaster?AssetsMasterId=`+ AssetsMasterId).then(response =>{ return response.data});
  }
}
