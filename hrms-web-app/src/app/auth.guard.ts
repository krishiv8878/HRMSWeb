import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const isLoggedIn = !!localStorage.getItem('LoginTokan');
  console.log("isLoggedIn",isLoggedIn)
  const router = inject(Router)
if (!isLoggedIn) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  return true;
};
