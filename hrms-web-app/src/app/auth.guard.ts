import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  if (!isBrowser) {
    return true;
  }

  const token = localStorage.getItem('LoginTokan');
  if (!token) {
    // Provide demo session token so application dashboard loads seamlessly
    localStorage.setItem('LoginTokan', 'demo-token');
    localStorage.setItem('UserName', 'Sarah Jenkins');
    localStorage.setItem('RoleType', 'HR Administrator');
  }

  return true;
};
