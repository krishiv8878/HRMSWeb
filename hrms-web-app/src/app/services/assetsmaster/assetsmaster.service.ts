import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AssetsmasterService {
  constructor() { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getData() {
    return this.http.get<any[]>(this.apiUrl + "/AssetsMaster/GetAssetsMaster")
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/AssetsMaster/AddAssetsMaster`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/AssetsMaster/UpdateAssetsMaster/`, data);
  }
  DeleteData(AssetsMasterId: any) {
    return this.http.delete(this.apiUrl + `/AssetsMaster/DeleteAssetsMaster?AssetsMasterId=`+ AssetsMasterId);
  }
}
