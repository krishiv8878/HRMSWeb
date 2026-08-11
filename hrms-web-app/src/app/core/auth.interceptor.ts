import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toster = inject(ToastrService);
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  const token = isBrowser ? localStorage.getItem('LoginTokan') : null;
  const excludeUrls = environment.excludeUrls;

  // Check if request should skip interceptor (login, forgot-password, etc.)
  const shouldSkip = excludeUrls ? excludeUrls.some(url => req.url.includes(url)) : false;

  if (shouldSkip) {
    return next(req);
  }

  // ----------------------------------------------------
  // 1. Check token expiration BEFORE sending HTTP request
  // ----------------------------------------------------
  if (token && isBrowser) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload && payload.exp) {
          const exp = payload.exp * 1000;

          if (Date.now() > exp) {
            console.log("⚠ Token Expired — Auto Logout");
            localStorage.clear();
            if (window.location.pathname !== '/login') {
              toster.error('Session is expired !', 'Session Expired');
              router.navigate(['/login']);
            }
            return throwError(() => new Error("Session is expired !"));
          }
        }
      }
    } catch (e) {
      console.log("⚠ Token format verification error");
    }

    // Attach Bearer token to request headers
    req = req.clone({
      withCredentials: true,
      setHeaders: {
        Authorization: `Bearer ${token}`,
      }
    });
  }

  // ----------------------------------------------------
  // 2. Handle 401 & 403 HTTP Error Responses → Auto Logout
  // ----------------------------------------------------
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401 || error.status === 403) {
        if (isBrowser && window.location.pathname !== '/login') {
          console.log("❌ 401/403 Unauthorized — Session Expired Auto Logout");
          localStorage.clear();
          toster.error('Session is expired !', 'Session Expired');
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
