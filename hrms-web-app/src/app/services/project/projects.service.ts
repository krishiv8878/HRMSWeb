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
      catchError(() => this.http.get<any>(`${this.apiUrl}/ProjectMaster/GetAllProjectMaster`)),
      catchError(() => this.http.get<any>(`${this.apiUrl}/ProjectMaster/GetProjects`)),
      catchError((err) => {
        console.error('Error fetching project master data from API:', err);
        return of({ data: [] });
      })
    );
  }

  createData(data: any): Observable<any> {
    const rawMgr = data.projectManagerId ?? data.managerId ?? data.ProjectManagerId ?? data.ManagerId ?? null;
    const managerId = (rawMgr !== null && rawMgr !== undefined && rawMgr !== '' && rawMgr !== 'null')
      ? Number(rawMgr)
      : null;
    const validMgrId = (managerId !== null && !isNaN(managerId) && managerId > 0) ? managerId : null;

    const body = {
      id: 0,
      projectName: (data.projectName || '').trim(),
      clientName: (data.clientName || '').trim(),
      clientRegion: data.clientRegion || 'Global',
      description: (data.description || '').trim(),
      projectManagerId: validMgrId,
      managerId: validMgrId,
      ProjectManagerId: validMgrId,
      ManagerId: validMgrId,
      teamSize: Number(data.teamSize || 0),
      status: data.status || 'In Progress',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      isActive: data.isActive !== false,
      isDeleted: false
    };

    return this.http.post<any>(`${this.apiUrl}/ProjectMaster/AddProjectMaster`, body).pipe(
      catchError((err) => {
        console.error('Error creating ProjectMaster:', err);
        throw err;
      })
    );
  }

  updateData(data: any, projectId?: any): Observable<any> {
    const numericId = Number(projectId || data.id || data.projectMasterId || 0);
    const rawMgr = data.projectManagerId ?? data.managerId ?? data.ProjectManagerId ?? data.ManagerId ?? null;
    const managerId = (rawMgr !== null && rawMgr !== undefined && rawMgr !== '' && rawMgr !== 'null')
      ? Number(rawMgr)
      : null;
    const validMgrId = (managerId !== null && !isNaN(managerId) && managerId > 0) ? managerId : null;

    const body = {
      id: numericId,
      projectMasterId: numericId,
      projectName: (data.projectName || '').trim(),
      clientName: (data.clientName || '').trim(),
      clientRegion: data.clientRegion || 'Global',
      description: (data.description || '').trim(),
      projectManagerId: validMgrId,
      managerId: validMgrId,
      ProjectManagerId: validMgrId,
      ManagerId: validMgrId,
      teamSize: Number(data.teamSize || 0),
      status: data.status || 'In Progress',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      isActive: data.isActive !== false,
      isDeleted: Boolean(data.isDeleted)
    };

    return this.http.put<any>(`${this.apiUrl}/ProjectMaster/UpdateProjectMaster/${numericId}`, body);
  }

  DeleteData(projectMasterId: any): Observable<any> {
    const numericId = Number(projectMasterId || 0);

    return this.http.delete<any>(`${this.apiUrl}/ProjectMaster/DeleteProjectMaster/${numericId}`).pipe(
      catchError(() => this.http.delete<any>(`${this.apiUrl}/ProjectMaster/DeleteProjectMaster?id=${numericId}`)),
      catchError(() => {
        const body = { id: numericId, projectMasterId: numericId, isActive: false, isDeleted: true };
        return this.updateData(body, numericId);
      })
    );
  }
}
