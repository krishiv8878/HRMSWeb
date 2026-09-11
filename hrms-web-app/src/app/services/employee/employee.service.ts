import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, catchError, of, tap, throwError } from 'rxjs';

export interface UserProfileInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  profileImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private avatarSubject = new BehaviorSubject<string | null>(this.getInitialAvatar());
  avatar$: Observable<string | null> = this.avatarSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<UserProfileInfo>(this.getInitialUserProfile());
  userProfile$: Observable<UserProfileInfo> = this.userProfileSubject.asObservable();

  constructor() {
    this.refreshCurrentLoggedInUserAvatar();
  }

  refreshCurrentLoggedInUserAvatar(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
    if (currentEmpId <= 0) return;

    this.getEmployeeById(currentEmpId).subscribe({
      next: (res: any) => {
        const emp = res?.data || res?.result || res;
        if (emp && emp.profileImage) {
          this.setProfileAvatar(emp.profileImage);
        } else {
          localStorage.removeItem('userAvatar');
          localStorage.removeItem('profileImage');
          localStorage.removeItem('profilePic');
          localStorage.removeItem('uploadedProfileAvatar');
          this.avatarSubject.next(null);
        }
      },
      error: () => {}
    });
  }

  private getInitialUserProfile(): UserProfileInfo {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const fn = localStorage.getItem('firstName') || '';
      const ln = localStorage.getItem('lastName') || '';
      const storedName = localStorage.getItem('userName') || localStorage.getItem('fullName') || localStorage.getItem('UserName') || `${fn} ${ln}`.trim() || 'User Profile';
      return {
        firstName: fn,
        lastName: ln,
        fullName: storedName,
        email: localStorage.getItem('userEmail') || ''
      };
    }
    return { firstName: '', lastName: '', fullName: 'User Profile' };
  }

  getUserProfile(): UserProfileInfo {
    return this.userProfileSubject.value;
  }

  setProfileInfo(firstName: string, lastName: string, fullName?: string, email?: string) {
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    const computedName = fullName || `${fn} ${ln}`.trim() || 'User Profile';

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (fn) localStorage.setItem('firstName', fn);
      if (ln) localStorage.setItem('lastName', ln);
      if (computedName) {
        localStorage.setItem('userName', computedName);
        localStorage.setItem('fullName', computedName);
        localStorage.setItem('employeeName', computedName);
        localStorage.setItem('UserName', computedName);
      }
      if (email) localStorage.setItem('userEmail', email);
    }

    this.userProfileSubject.next({
      firstName: fn,
      lastName: ln,
      fullName: computedName,
      email: email || ''
    });
  }

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

  getEmployeeById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Employee/GetEmployeeById/${id}`).pipe(
      catchError((err) => {
        console.error('Error fetching employee by id:', err);
        return of(null);
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

  sanitizeEmployeePayload(raw: any): any {
    if (!raw || typeof raw !== 'object') return raw;
    const payload = { ...raw };

    // Sanitize percentage (float? in backend)
    if (payload.percentage !== undefined && payload.percentage !== null) {
      if (typeof payload.percentage === 'string') {
        const match = payload.percentage.match(/[-+]?[0-9]*\.?[0-9]+/);
        payload.percentage = match ? parseFloat(match[0]) : null;
      } else if (typeof payload.percentage === 'number') {
        payload.percentage = isNaN(payload.percentage) ? null : payload.percentage;
      } else {
        payload.percentage = null;
      }
    }

    // Sanitize yearOfPassing (int? in backend)
    if (payload.yearOfPassing !== undefined && payload.yearOfPassing !== null) {
      const parsedYear = parseInt(String(payload.yearOfPassing), 10);
      payload.yearOfPassing = isNaN(parsedYear) ? null : parsedYear;
    }

    // Sanitize skills (List<string?>? in backend)
    if (payload.skills !== undefined && payload.skills !== null) {
      if (typeof payload.skills === 'string') {
        const trimmed = payload.skills.trim();
        payload.skills = trimmed ? trimmed.split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      } else if (Array.isArray(payload.skills)) {
        payload.skills = payload.skills.map((s: any) => (s != null ? String(s).trim() : '')).filter((s: string) => s.length > 0);
      } else {
        payload.skills = null;
      }
    }

    // Sanitize projects (List<string?>? in backend)
    if (payload.projects !== undefined && payload.projects !== null) {
      if (typeof payload.projects === 'string') {
        const trimmed = payload.projects.trim();
        payload.projects = trimmed ? trimmed.split(',').map((p: string) => p.trim()).filter(Boolean) : null;
      } else if (Array.isArray(payload.projects)) {
        payload.projects = payload.projects.map((p: any) => (p != null ? String(p).trim() : '')).filter((p: string) => p.length > 0);
      } else {
        payload.projects = null;
      }
    }

    // Ensure list IDs are arrays or null
    if (payload.skillIds !== undefined && !Array.isArray(payload.skillIds)) {
      payload.skillIds = null;
    }
    if (payload.projectIds !== undefined && !Array.isArray(payload.projectIds)) {
      payload.projectIds = null;
    }
    if (payload.roleIds !== undefined && !Array.isArray(payload.roleIds)) {
      payload.roleIds = null;
    }

    // Sanitize date fields (DateTime? in backend)
    const dateFields = ['dateOfJoining', 'dateOfBirth', 'passportIssueDate', 'passportExpiryDate'];
    for (const field of dateFields) {
      if (payload[field] !== undefined) {
        if (!payload[field] || String(payload[field]).trim() === '') {
          payload[field] = null;
        } else if (payload[field] instanceof Date) {
          payload[field] = payload[field].toISOString();
        }
      }
    }

    // Sanitize ID
    if (payload.id !== undefined && payload.id !== null) {
      payload.id = Number(payload.id) || 0;
    }

    // Sanitize ManagerId
    if (payload.managerId !== undefined && payload.managerId !== null) {
      const mId = Number(payload.managerId);
      payload.managerId = !isNaN(mId) && mId > 0 ? mId : null;
    }

    return payload;
  }

  createData(data: any): Observable<any> {
    const payload = this.sanitizeEmployeePayload(data);
    return this.http.post<any>(this.apiUrl + `/Employee/AddEmployee`, payload);
  }

  updateData(data: any): Observable<any> {
    const payload = this.sanitizeEmployeePayload(data);
    return this.http.put<any>(this.apiUrl + `/Employee/UpdateEmployee`, payload).pipe(
      tap(() => {
        const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
        const currentUserId = isBrowser ? Number(localStorage.getItem('employeeId')) : 0;
        const targetId = Number(payload?.id || payload?.employeeId);
        if (payload?.profileImage && currentUserId > 0 && targetId === currentUserId) {
          this.setProfileAvatar(payload.profileImage);
        }
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
        const currentUserId = typeof window !== 'undefined' ? Number(localStorage.getItem('employeeId')) : 0;
        if (imgName && currentUserId > 0 && Number(employeeId) === currentUserId) {
          this.setProfileAvatar(imgName);
        }
      })
    );
  }
}
