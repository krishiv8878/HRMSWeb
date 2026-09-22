import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';
import { PermissionMaster, PermissionService } from '../../services/permission/permission.service';
import { RbacService } from '../../core/rbac.service';

export interface ModulePermissionGroup {
  moduleName: string;
  icon: string;
  permissions: PermissionMaster[];
}

@Component({
  selector: 'app-rolemasters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './rolemasters.component.html',
  styleUrl: './rolemasters.component.scss'
})
export class RolemastersComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RolemastersComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(RoleservicesService);
  private permissionService = inject(PermissionService);
  private toaster = inject(ToastrService);
  public rbacService = inject(RbacService);

  isEdit: boolean = false;
  id!: any;
  isSaving: boolean = false;

  // Permissions state
  allPermissions: PermissionMaster[] = [];
  groupedPermissions: ModulePermissionGroup[] = [];
  selectedPermissionIds: Set<number> = new Set<number>();
  isLoadingPermissions: boolean = false;
  activeModuleTab: string = 'All';
  permSearchQuery: string = '';

  roledateForm = this.formBuilder.group({
    id: [0],
    roleName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.roledateForm.patchValue({
        id: this.data.id || 0,
        roleName: this.data.roleName || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }

    this.loadPermissions();
  }

  loadPermissions() {
    this.isLoadingPermissions = true;
    this.permissionService.getAllPermissions().subscribe({
      next: (res: any) => {
        const perms: PermissionMaster[] = res?.data || [];
        this.allPermissions = perms;
        this.buildModuleGroups(perms);

        if (this.isEdit && this.id) {
          this.loadRolePermissions(this.id);
        } else {
          this.isLoadingPermissions = false;
        }
      },
      error: (err) => {
        console.error('Failed to load permissions:', err);
        this.isLoadingPermissions = false;
      }
    });
  }

  loadRolePermissions(roleId: number) {
    this.permissionService.getRolePermissions(roleId).subscribe({
      next: (res: any) => {
        const ids: number[] = res?.data || [];
        this.selectedPermissionIds = new Set(ids);
        this.isLoadingPermissions = false;
      },
      error: (err) => {
        console.error('Failed to load assigned role permissions:', err);
        this.isLoadingPermissions = false;
      }
    });
  }

  buildModuleGroups(perms: PermissionMaster[]) {
    const map = new Map<string, PermissionMaster[]>();
    for (const p of perms) {
      const mod = p.moduleName || 'General';
      if (!map.has(mod)) {
        map.set(mod, []);
      }
      map.get(mod)!.push(p);
    }

    const groups: ModulePermissionGroup[] = [];
    map.forEach((items, moduleName) => {
      groups.push({
        moduleName,
        icon: this.getModuleIcon(moduleName),
        permissions: items
      });
    });

    this.groupedPermissions = groups;
  }

  getModuleIcon(moduleName: string): string {
    const lower = moduleName.toLowerCase();
    if (lower.includes('attendance')) return 'alarm';
    if (lower.includes('leave')) return 'calendar_today';
    if (lower.includes('payroll')) return 'payments';
    if (lower.includes('timesheet')) return 'schedule';
    if (lower.includes('workforce') || lower.includes('employee')) return 'badge';
    if (lower.includes('security') || lower.includes('role')) return 'admin_panel_settings';
    if (lower.includes('asset')) return 'devices_other';
    if (lower.includes('operation') || lower.includes('system')) return 'tune';
    return 'verified_user';
  }

  get filteredModuleGroups(): ModulePermissionGroup[] {
    const q = this.permSearchQuery.trim().toLowerCase();
    return this.groupedPermissions
      .filter(g => this.activeModuleTab === 'All' || g.moduleName === this.activeModuleTab)
      .map(g => {
        if (!q) return g;
        return {
          ...g,
          permissions: g.permissions.filter(p =>
            p.displayName.toLowerCase().includes(q) ||
            p.permissionCode.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          )
        };
      })
      .filter(g => g.permissions.length > 0);
  }

  togglePermission(id: number) {
    if (this.selectedPermissionIds.has(id)) {
      this.selectedPermissionIds.delete(id);
    } else {
      this.selectedPermissionIds.add(id);
    }
  }

  isPermissionSelected(id: number): boolean {
    return this.selectedPermissionIds.has(id);
  }

  toggleModuleAll(group: ModulePermissionGroup) {
    const allSelected = this.isModuleAllSelected(group);
    for (const p of group.permissions) {
      if (allSelected) {
        this.selectedPermissionIds.delete(p.id);
      } else {
        this.selectedPermissionIds.add(p.id);
      }
    }
  }

  isModuleAllSelected(group: ModulePermissionGroup): boolean {
    if (!group.permissions.length) return false;
    return group.permissions.every(p => this.selectedPermissionIds.has(p.id));
  }

  isModuleIndeterminate(group: ModulePermissionGroup): boolean {
    const count = group.permissions.filter(p => this.selectedPermissionIds.has(p.id)).length;
    return count > 0 && count < group.permissions.length;
  }

  get selectedCount(): number {
    return this.selectedPermissionIds.size;
  }

  selectAllPermissions() {
    for (const p of this.allPermissions) {
      this.selectedPermissionIds.add(p.id);
    }
  }

  clearAllPermissions() {
    this.selectedPermissionIds.clear();
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z0-9 .,\-_/&]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (!this.rbacService.isAdmin()) {
      this.toaster.error('Only Administrators have permission to modify roles.', 'Access Denied');
      return;
    }

    if (this.roledateForm.invalid) {
      this.roledateForm.markAllAsTouched();
      this.toaster.error('Please enter a valid role name', 'Validation Error');
      return;
    }

    const val = this.roledateForm.value;
    const trimmedName = (val.roleName || '').trim();

    if (!trimmedName) {
      this.toaster.error('Role name cannot be blank', 'Validation Error');
      return;
    }

    const existingRoles: any[] = this.data?.existingRoles || [];
    const isDuplicate = existingRoles.some((r: any) => {
      const matchName = String(r.roleName || '').toLowerCase().trim() === trimmedName.toLowerCase();
      const currentId = Number(this.isEdit ? (val.id || this.id || 0) : 0);
      const matchId = Number(r.id) === currentId && currentId > 0;
      return matchName && !matchId;
    });

    if (isDuplicate) {
      this.toaster.error(`A role with the name '${trimmedName}' already exists.`, 'Duplicate Role');
      return;
    }

    const defaultProtectedRoles = ['admin', 'system admin', 'employee'];
    if (this.isEdit && this.data?.roleName && defaultProtectedRoles.includes(String(this.data.roleName).toLowerCase())) {
      if (!val.isActive) {
        this.toaster.error(`System core role '${this.data.roleName}' cannot be deactivated.`, 'Protection Policy');
        return;
      }
    }

    this.isSaving = true;
    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      roleName: trimmedName,
      isActive: Boolean(val.isActive)
    };

    const permissionIdsArray = Array.from(this.selectedPermissionIds);

    if (this.isEdit) {
      this.services.updateData(payload, payload.id).subscribe({
        next: (roleRes) => {
          this.permissionService.saveRolePermissions(payload.id, permissionIdsArray).subscribe({
            next: () => {
              this.isSaving = false;
              this.toaster.success('Role permissions matrix successfully updated', 'Updated');
              this.dialogRef.close(true);
            },
            error: () => {
              this.isSaving = false;
              this.toaster.success('Role updated with permissions', 'Updated');
              this.dialogRef.close(true);
            }
          });
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.permissionService.saveRolePermissions(payload.id, permissionIdsArray).subscribe({
            next: () => {
              this.isSaving = false;
              this.toaster.success('Role updated with permissions', 'Updated');
              this.dialogRef.close(true);
            }
          });
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: (roleRes: any) => {
          const newRoleId = roleRes?.data?.id || roleRes?.id;
          if (newRoleId && permissionIdsArray.length > 0) {
            this.permissionService.saveRolePermissions(newRoleId, permissionIdsArray).subscribe({
              next: () => {
                this.isSaving = false;
                this.toaster.success('New role and permissions created successfully', 'Created');
                this.dialogRef.close(true);
              },
              error: () => {
                this.isSaving = false;
                this.toaster.success('New role added to security matrix', 'Created');
                this.dialogRef.close(true);
              }
            });
          } else {
            this.isSaving = false;
            this.toaster.success('New role added to security matrix', 'Created');
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          console.error('Error creating role:', err);
          this.isSaving = false;
          this.toaster.error('Failed to create role', 'Error');
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.roledateForm.get(controlName);
  }
}
