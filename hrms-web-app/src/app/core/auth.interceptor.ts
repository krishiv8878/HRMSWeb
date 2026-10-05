import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

// In-flight mutating requests tracker to prevent duplicate rapid requests across the entire website
const pendingMutations = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 1200;

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

  // Prevent Node.js SSR prerendering from sending unauthenticated HTTP calls during ng serve/build
  if (!isBrowser) {
    return of(new HttpResponse({ status: 200, body: { data: [] } })) as any;
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
  // 2. Global Guard: Prevent Duplicate Mutating HTTP Requests (POST / PUT / DELETE)
  // ----------------------------------------------------
  const isMutating = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
  const isFormData = typeof FormData !== 'undefined' && req.body instanceof FormData;
  let requestKey = '';

  if (isMutating && isBrowser && !isFormData) {
    try {
      requestKey = `${req.method}_${req.urlWithParams}_${JSON.stringify(req.body || {})}`;
      const now = Date.now();
      const lastSent = pendingMutations.get(requestKey);

      if (lastSent && (now - lastSent) < DUPLICATE_WINDOW_MS) {
        console.warn('⚠ Blocked duplicate mutating request:', req.method, req.url);
        return throwError(() => new Error('Duplicate request blocked. Please wait a moment.'));
      }
      pendingMutations.set(requestKey, now);
    } catch {
      // Safe fallback if body serialization fails
    }
  }

  // ----------------------------------------------------
  // 3. Handle 401 Unauthorized → Auto Logout & Finalize Cleanup
  // ----------------------------------------------------
  return next(req).pipe(
    finalize(() => {
      if (requestKey) {
        setTimeout(() => {
          pendingMutations.delete(requestKey);
        }, DUPLICATE_WINDOW_MS);
      }
    }),
    catchError((error) => {
      if (requestKey) {
        pendingMutations.delete(requestKey);
      }
      if (error.status === 401) {
        if (isBrowser && window.location.pathname !== '/login') {
          console.log("❌ 401 Unauthorized — Session Expired Auto Logout");
          localStorage.clear();
          toster.error('Session is expired !', 'Session Expired');
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        console.warn("🔒 403 Forbidden — Access Denied for URL:", req.url);
      }

      return throwError(() => error);
    })
  );
};
