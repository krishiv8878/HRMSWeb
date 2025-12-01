import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toster = inject(ToastrService)
  const token = localStorage.getItem('LoginTokan');
  const excludeUrls = environment.excludeUrls;

  // Check if request should skip interceptor
  const shouldSkip = excludeUrls.some(url => req.url.includes(url));

  if (shouldSkip) {
    console.log("⛔ Interceptor skipped for:", req.url);
    return next(req);
  }

  // ------------------------------
  // Check token expiration BEFORE sending request
  // ------------------------------
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;

      if (Date.now() > exp) {
        console.log("⚠ Token Expired — Auto Logout");

        localStorage.clear();
        router.navigate(['/login']);
        toster.error('Session is expired !')
        return throwError(() => new Error("Token expired"));
      }
    } catch (e) {
      console.log("⚠ Invalid token format");
    }

    // Add token to headers
    req = req.clone({
      withCredentials: true,
      setHeaders: {
        Authorization: `Bearer ${token}`,
      }
    });
  }

  // ------------------------------
  // Handle 401 responses → Auto logout
  // ------------------------------
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        console.log("❌ 401 Unauthorized — Auto Logout");

        localStorage.clear();
        router.navigate(['/login']);
        toster.error('Session is expired !')

      }

      return throwError(() => error);
    })
  );
};
