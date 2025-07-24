import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor(private tokenInterceptor:  tokenInterceptor) { }

  async getAllData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/ProjectMaster/GetProjectMaster").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/ProjectMaster/AddProjectMaster`, data).then(response =>{ return response.data});
  }
  async updateData(data: any, projectId:any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/ProjectMaster/UpdateProjectMaster/`+ projectId, data).then(response =>{ return response.data});
  }
  async DeleteData(ProjectMasterId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/ProjectMaster/DeleteProjectMaster/` + ProjectMasterId).then(response =>{ return response.data});
  }
}
