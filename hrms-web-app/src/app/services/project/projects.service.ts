import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  getAllData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ProjectMaster/GetProjectMaster`).pipe(
      catchError((err) => {
        console.error('Error fetching project master data:', err);
        return of({ data: [] });
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ProjectMaster/AddProjectMaster`, data);
  }

  updateData(data: any, projectId?: any): Observable<any> {
    const id = projectId || data.id || '';
    return this.http.put<any>(`${this.apiUrl}/ProjectMaster/UpdateProjectMaster/${id}`, data).pipe(
      catchError(() => {
        return this.http.post<any>(`${this.apiUrl}/ProjectMaster/UpdateProjectMaster/${id}`, data);
      })
    );
  }

  DeleteData(projectMasterId: any): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/ProjectMaster/DeleteProjectMaster/${projectMasterId}`);
  }
}
