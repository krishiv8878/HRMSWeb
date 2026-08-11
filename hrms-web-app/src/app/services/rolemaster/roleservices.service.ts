import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleservicesService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  getAllData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/RoleMaster/GetRoles").pipe(
      catchError((err) => {
        console.error('Error fetching roles:', err);
        return of({ data: [] });
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/RoleMaster/AddRole`, data);
  }

  updateData(data: any, RoleId?: any): Observable<any> {
    const rId = RoleId || data.id || '';
    return this.http.put<any>(this.apiUrl + `/RoleMaster/UpdateRole/` + rId, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/RoleMaster/UpdateRole/` + rId, data);
      })
    );
  }

  DeleteData(RoleMasterId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/RoleMaster/DeleteRole/` + RoleMasterId);
  }
}
