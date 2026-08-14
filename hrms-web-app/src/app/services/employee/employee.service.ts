import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private avatarSubject = new BehaviorSubject<string | null>(this.getInitialAvatar());
  avatar$: Observable<string | null> = this.avatarSubject.asObservable();

  private getInitialAvatar(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('userAvatar') || localStorage.getItem('profileImage') || localStorage.getItem('profilePic') || localStorage.getItem('uploadedProfileAvatar');
      if (stored) {
        return stored.startsWith('http') || stored.startsWith('data:')
          ? stored
          : `${this.apiUrl.replace('/api', '')}/ProfileImages/${stored}`;
      }
    }
    return null;
  }

  getProfileAvatar(): string | null {
    return this.avatarSubject.value || this.getInitialAvatar();
  }

  setProfileAvatar(avatarUrlOrName: string) {
    if (!avatarUrlOrName) return;
    const fullUrl = avatarUrlOrName.startsWith('http') || avatarUrlOrName.startsWith('data:')
      ? avatarUrlOrName
      : `${this.apiUrl.replace('/api', '')}/ProfileImages/${avatarUrlOrName}`;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('profileImage', avatarUrlOrName);
      localStorage.setItem('userAvatar', fullUrl);
      localStorage.setItem('profilePic', avatarUrlOrName);
      localStorage.setItem('uploadedProfileAvatar', fullUrl);
    }

    this.avatarSubject.next(fullUrl);
  }

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Employee/GetEmployees").pipe(
      catchError((err) => {
        console.error('Error fetching employees:', err);
        return of({ data: [] });
      })
    );
  }

  getManager(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Employee/GetManagers").pipe(
      catchError((err) => {
        console.error('Error fetching managers:', err);
        return of([]);
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/Employee/AddEmployee`, data);
  }

  updateData(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/Employee/UpdateEmployee`, data).pipe(
      tap(() => {
        if (data?.profileImage) {
          this.setProfileAvatar(data.profileImage);
        }
      }),
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/Employee/UpdateEmployee`, data).pipe(
          tap(() => {
            if (data?.profileImage) {
              this.setProfileAvatar(data.profileImage);
            }
          })
        );
      })
    );
  }

  DeleteData(employeeId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/Employee/DeleteEmployee?employeeId=` + employeeId);
  }

  uploadProfileImage(employeeId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('employeeId', employeeId.toString());
    formData.append('file', file);
    return this.http.post<any>(this.apiUrl + '/Employee/UploadProfileImage', formData).pipe(
      tap((response: any) => {
        const imgName = response?.data || response?.fileName || '';
        if (imgName) {
          this.setProfileAvatar(imgName);
        }
      })
    );
  }
}
