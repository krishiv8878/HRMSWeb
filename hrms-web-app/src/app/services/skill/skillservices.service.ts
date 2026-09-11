import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkillservicesService {
  apiUrl = environment.host;
  http = inject(HttpClient);

  getSkill(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Skill/GetSkills`).pipe(
      catchError((err) => {
        console.error('Error fetching skills:', err);
        return of({ data: [] });
      })
    );
  }

  createSkill(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/Skill/AddSkills`, data);
  }

  updateSkill(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/Skill/UpdateSkill`, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/Skill/UpdateSkill`, data);
      })
    );
  }

  DeleteSkill(skillId: any): Observable<any> {
    const id = Number(skillId || 0);
    return this.http.delete<any>(this.apiUrl + `/Skill/DeleteSkill?skillId=` + id).pipe(
      catchError(() => this.http.delete<any>(this.apiUrl + `/Skill/DeleteSkill/${id}`))
    );
  }
}
