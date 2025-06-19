import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  // const localData = localStorage.getItem("LoginTokan");
  // debugger;
  const router = inject(Router)
  if (typeof window !== 'undefined' && localStorage.getItem("LoginTokan") !== null) {
    return true;
  } else {
    router.navigateByUrl('login')
    return false;
  }
};
