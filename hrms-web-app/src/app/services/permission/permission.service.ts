import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of, tap } from 'rxjs';

export interface PermissionMaster {
  id: number;
  permissionCode: string;
  moduleName: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;
  private myPermissions: Set<string> = new Set<string>();

  getAllPermissions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Permission/GetAll`).pipe(
      catchError(err => {
        console.error('Error fetching all permissions:', err);
        return of({ statusCode: 500, data: [] });
      })
    );
  }

  getRolePermissions(roleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Permission/GetRolePermissions/${roleId}`).pipe(
      catchError(err => {
        console.error(`Error fetching permissions for role ${roleId}:`, err);
        return of({ statusCode: 500, data: [] });
      })
    );
  }

  saveRolePermissions(roleId: number, permissionIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Permission/SaveRolePermissions`, {
      roleId,
      permissionIds
    }).pipe(
      catchError(err => {
        console.error(`Error saving permissions for role ${roleId}:`, err);
        return of({ statusCode: 500, message: 'Failed to save permissions' });
      })
    );
  }

  getMyPermissions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Permission/MyPermissions`).pipe(
      tap(res => {
        if (res && res.data && Array.isArray(res.data)) {
          this.myPermissions = new Set(res.data.map((p: string) => p.toUpperCase()));
        }
      }),
      catchError(err => {
        console.error('Error fetching my permissions:', err);
        return of({ statusCode: 500, data: [] });
      })
    );
  }

  getUserPermissions(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Permission/GetUserPermissions/${employeeId}`).pipe(
      catchError(err => {
        console.error(`Error fetching permissions for employee ${employeeId}:`, err);
        return of({ statusCode: 500, data: [] });
      })
    );
  }

  hasPermission(permissionCode: string): boolean {
    if (!permissionCode) return true;
    return this.myPermissions.has(permissionCode.toUpperCase());
  }
}
