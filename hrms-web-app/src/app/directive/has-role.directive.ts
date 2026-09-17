import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { RbacService } from '../core/rbac.service';

@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private rbacService = inject(RbacService);

  private allowedRoles: string[] = [];
  private isVisible = false;

  @Input() set hasRole(roles: string | string[]) {
    if (typeof roles === 'string') {
      this.allowedRoles = [roles];
    } else if (Array.isArray(roles)) {
      this.allowedRoles = roles;
    } else {
      this.allowedRoles = [];
    }
    this.updateView();
  }

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    const hasPermission = this.allowedRoles.length === 0 || this.rbacService.hasAnyRole(this.allowedRoles);

    if (hasPermission && !this.isVisible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isVisible = true;
    } else if (!hasPermission && this.isVisible) {
      this.viewContainer.clear();
      this.isVisible = false;
    }
  }
}
