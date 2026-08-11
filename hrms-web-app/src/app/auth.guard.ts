import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route, state) => {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  if (!isBrowser) {
    return true;
  }

  const router = inject(Router);
  const toastr = inject(ToastrService);
  const token = localStorage.getItem('LoginTokan');

  // 1. If token is missing and not already on login page, redirect to login
  if (!token) {
    if (window.location.pathname !== '/login') {
      toastr.error('Session is expired !', 'Session Expired');
      router.navigate(['/login']);
    }
    return false;
  }

  // 2. Validate token expiration timestamp if JWT token
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload && payload.exp) {
        const expTime = payload.exp * 1000;
        if (Date.now() > expTime) {
          console.warn('🔒 Session expired — Logging out user');
          localStorage.clear();
          if (window.location.pathname !== '/login') {
            toastr.error('Session is expired !', 'Session Expired');
            router.navigate(['/login']);
          }
          return false;
        }
      }
    }
  } catch (e) {
    console.warn('Token parse check:', e);
  }

  return true;
};
