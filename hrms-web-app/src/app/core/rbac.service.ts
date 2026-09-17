import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  constructor() {}

  /**
   * Retrieves the roles list of the currently logged-in user from localStorage / JWT.
   */
  getUserRoles(): string[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }

    // 1. Check RoleType stored directly during login
    const rawRoles = localStorage.getItem('RoleType');
    if (rawRoles) {
      return rawRoles
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }

    // 2. Fallback: Parse roles from LoginTokan JWT payload
    const token = localStorage.getItem('LoginTokan');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const roleClaim = payload['role'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
          if (Array.isArray(roleClaim)) {
            return roleClaim;
          } else if (typeof roleClaim === 'string') {
            return roleClaim.split(',').map((r: string) => r.trim());
          }
        }
      } catch (e) {
        console.warn('Could not decode roles from token:', e);
      }
    }

    return ['Employee'];
  }

  /**
   * Check if current user has a specific role (case-insensitive)
   */
  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles.some(r => r.localeCompare(role, undefined, { sensitivity: 'accent' }) === 0);
  }

  /**
   * Check if current user has ANY of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) return true;
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Convenience helpers
   */
  isAdmin(): boolean {
    return this.hasAnyRole(['Admin', 'System Admin']);
  }

  isHR(): boolean {
    return this.hasAnyRole(['HR', 'HR Operations']);
  }

  isManager(): boolean {
    return this.hasAnyRole(['Manager', 'Management']);
  }

  isEmployee(): boolean {
    return this.hasRole('Employee');
  }
}
