import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import axios, { AxiosHeaders } from 'axios';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class SkillservicesService {
  constructor(private tokenInterceptor : tokenInterceptor) { }
  apiUrl = environment.host
  http = inject(HttpClient)


  async getSkill() {
    // const tok = localStorage.getItem('LoginTokan');
    // const headers = new AxiosHeaders({
    //   'Content-Type': 'application/json',
    //   Authorization: `Bearer ${tok}`, 
    // });
    // return this.http.get<any[]>(`${this.apiUrl}/Skill/GetSkills`,{headers});
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl+'/Skill/GetSkills').then(response =>{ return response.data});  
  }

  async createSkill(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl+'/Skill/AddSkills/',data).then(response =>{ return response.data});
  }

  async updateSkill(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl+'/Skill/UpdateSkill/',data).then(response =>{ return response.data}); 
  }

  async DeleteSkill(skillId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl+'/Skill/DeleteSkill?skillId=',skillId).then(response =>{ return response.data});
  }
 
}
