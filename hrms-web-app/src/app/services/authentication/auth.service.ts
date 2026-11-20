import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() { }
  http = inject(HttpClient);
  apiUrl = environment.host;

  createLogin(data: any) {
    return this.http.post<any>(`${this.apiUrl}/UserLogin/Login`, data, { withCredentials: true });
  }

  createRegister(data: any) {
    return this.http.post<any>(`${this.apiUrl}/UserRegistration/Registration`, data);
  }

  inviteEmployee(data: any) {
    return this.http.post<any>(`${this.apiUrl}/UserRegistration/InviteEmployee`, data);
  }

  verifyInvitation(token: string) {
    return this.http.get<any>(`${this.apiUrl}/UserRegistration/VerifyInvitation?token=${encodeURIComponent(token)}`);
  }

  acceptInvitation(data: any) {
    return this.http.post<any>(`${this.apiUrl}/UserRegistration/AcceptInvitation`, data);
  }

  /**
   * Requests a password reset link by submitting the account email.
   * Hits POST /api/UserLogin/forgot-password
   */
  forgotPassword(data: { email: string; clientUrl: string }) {
    return this.http.post<any>(`${this.apiUrl}/UserLogin/forgot-password`, data);
  }

  /**
   * Completes password reset by submitting the token and new password.
   * Hits POST /api/UserLogin/reset-password
   */
  resetPassword(data: { token: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/UserLogin/reset-password`, data);
  }

  /**
   * Backward-compatibility alias for legacy code paths.
   */
  forgotpassword(data: any) {
    return this.resetPassword(data);
  }

  /**
   * Fetches active password complexity policies from the backend.
   */
  getPasswordPolicy() {
    return this.http.get<any>(`${this.apiUrl}/UserLogin/password-policy`);
  }
}
