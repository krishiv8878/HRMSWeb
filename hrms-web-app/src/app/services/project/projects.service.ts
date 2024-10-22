import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor() { }

  getAllData() {
    return this.http.get<any[]>(this.apiUrl + "/ProjectMaster/GetProjectMaster");
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/ProjectMaster/AddProjectMaster`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/ProjectMaster/UpdateProjectMaster/`, data);
  }
  DeleteData(ProjectMasterId: any) {
    return this.http.delete(this.apiUrl + `/ProjectMaster/DeleteProjectMaster?ProjectMasterId=` + ProjectMasterId);
  }
}
