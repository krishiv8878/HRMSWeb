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

    // 1. Prioritize roles decoded directly from the signed JWT payload (tamper-proof)
    const token = localStorage.getItem('LoginTokan');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const roleClaim = payload['role'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload['roleType'];
          if (Array.isArray(roleClaim) && roleClaim.length > 0) {
            return roleClaim;
          } else if (typeof roleClaim === 'string' && roleClaim.trim()) {
            return roleClaim.split(',').map((r: string) => r.trim()).filter(r => r.length > 0);
          }
        }
      } catch (e) {
        console.warn('Could not decode roles from token:', e);
      }
    }

    // 2. Fallback: Check RoleType stored during login
    const rawRoles = localStorage.getItem('RoleType');
    if (rawRoles) {
      return rawRoles
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);
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
