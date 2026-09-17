import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { map, Observable } from 'rxjs';
import { AssetItem, AssetMetricCard } from '../../interface/asset.interface';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { AssetCardComponent } from './asset-card/asset-card.component';
import { AssetTableComponent } from './asset-table/asset-table.component';
import { AssetsmastersComponent } from '../../modal/assetsmasters/assetsmasters.component';
import { RbacService } from '../../core/rbac.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { ProjectsService } from '../../services/project/projects.service';

@Component({
  selector: 'app-assetsmaster',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    AssetCardComponent,
    AssetTableComponent
  ],
  templateUrl: './assetsmaster.component.html',
  styleUrl: './assetsmaster.component.scss'
})
export class AssetsmasterComponent implements OnInit {
  private assetService = inject(AssetsmasterService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private rbacService = inject(RbacService);
  private employeeService = inject(EmployeeService);
  private projectsService = inject(ProjectsService);

  assignedProjects: any[] = [];

  get isAdmin(): boolean {
    return this.rbacService.isAdmin();
  }

  // Filter assets based on role: Admin sees all; Employee, Manager, HR see only assigned assets
  filteredAssets$: Observable<AssetItem[]> = this.assetService.assets$.pipe(
    map(assets => {
      if (this.isAdmin) {
        return assets;
      }
      const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
      const userName = (localStorage.getItem('UserName') || localStorage.getItem('userName') || localStorage.getItem('employeeName') || '').toLowerCase().trim();
      const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
      const profile = this.employeeService.getUserProfile();
      const fullName = (profile?.fullName || '').toLowerCase().trim();

      return assets.filter(a => {
        const aEmpId = Number(a.employeeId);
        if (currentEmpId > 0 && aEmpId > 0 && aEmpId === currentEmpId) {
          return true;
        }
        if (a.assignedTo && a.assignedTo !== 'Unassigned') {
          const assigned = a.assignedTo.toLowerCase().trim();
          if (userName && (assigned === userName || assigned.includes(userName) || userName.includes(assigned))) return true;
          if (fullName && (assigned === fullName || assigned.includes(fullName) || fullName.includes(assigned))) return true;
          if (userEmail && assigned === userEmail) return true;
        }
        return false;
      });
    })
  );

  metrics$: Observable<AssetMetricCard[]> = this.filteredAssets$.pipe(
    map(assets => this.assetService.getMetricsForAssets(assets, this.isAdmin))
  );

  ngOnInit() {
    this.assetService.fetchAssetsFromApi();
    this.loadAssignedProjects();
  }

  loadAssignedProjects() {
    const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
    if (currentEmpId > 0) {
      this.employeeService.getEmployeeById(currentEmpId).subscribe({
        next: (empRes: any) => {
          const emp = empRes?.data || empRes || null;
          const rawProjectIds = emp?.projectIds || emp?.ProjectIds || [];
          let pIds: number[] = [];
          if (Array.isArray(rawProjectIds)) {
            pIds = rawProjectIds.map((id: any) => Number(id));
          } else if (typeof rawProjectIds === 'string' && rawProjectIds.trim()) {
            try {
              const parsed = JSON.parse(rawProjectIds);
              if (Array.isArray(parsed)) pIds = parsed.map((id: any) => Number(id));
            } catch {
              pIds = rawProjectIds.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
            }
          }

          if (pIds.length > 0) {
            this.projectsService.getAllData().subscribe({
              next: (projRes: any) => {
                const list = Array.isArray(projRes) ? projRes : (projRes?.data || projRes?.result || []);
                this.assignedProjects = list.filter((p: any) => pIds.includes(Number(p.id || p.projectMasterId)));
              }
            });
          }
        }
      });
    }
  }

  onExport() {
    this.assetService.exportToCsv();
    this.toastr.success('Asset Inventory exported successfully!');
  }

  openAddAssetModal() {
    if (!this.isAdmin) {
      this.toastr.warning('Only administrators can add corporate assets.', 'Access Restricted');
      return;
    }
    const dialogRef = this.dialog.open(AssetsmastersComponent, {
      width: '560px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.assetService.recalculateMetrics();
      }
    });
  }
}
