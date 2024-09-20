import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SkillservicesService {
  constructor() { }
  apiUrl = "http://localhost:5220/api/Skill"
  http = inject(HttpClient)

  getskill() {
    return this.http.get<any[]>(this.apiUrl + "/GetSkills");
  }
}
