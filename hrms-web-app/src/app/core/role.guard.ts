import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RbacService } from './rbac.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  if (!isBrowser) {
    return true;
  }

  const rbacService = inject(RbacService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const expectedRoles = route.data?.['roles'] as string[];

  // If route doesn't specify roles, allow access
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  if (rbacService.hasAnyRole(expectedRoles)) {
    return true;
  }

  // Unauthorized access attempt
  console.warn(`[RoleGuard] Access denied to ${state.url}. Required roles: [${expectedRoles.join(', ')}]`);
  toastr.warning('You do not have permission to access this module.', 'Access Restricted');

  // Redirect to a safe fallback
  router.navigate(['/index/document']);
  return false;
};
