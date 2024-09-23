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

  getData() {
    return this.http.get<any[]>(this.apiUrl + "/Skill/GetSkills");
  }
}
