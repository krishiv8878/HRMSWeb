import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SkillservicesService {
  constructor() { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getSkill() {
    return this.http.get<any[]>(`${this.apiUrl}/Skill/GetSkills`);
  }

  createSkill(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Skill/AddSkills/`, data)
  }

  updateSkill(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Skill/UpdateSkill/`, data);
  }

  DeleteSkill(skillId: any) {
    return this.http.delete(this.apiUrl + `/Skill/DeleteSkill?skillId=`+ skillId);
  }
 
}
