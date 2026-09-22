import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, combineLatest, forkJoin, map, Observable, take } from 'rxjs';
import { AssetItem, AssetMetricCard } from '../../interface/asset.interface';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { AssetRequestItem } from '../../interface/asset-request.interface';
import { AssetTrackingModalComponent } from '../../modal/asset-tracking-modal/asset-tracking-modal.component';
import { AssetCardComponent } from './asset-card/asset-card.component';
import { AssetTableComponent } from './asset-table/asset-table.component';
import { AssetsmastersComponent } from '../../modal/assetsmasters/assetsmasters.component';
import { AssetTicketHistoryModalComponent } from '../../modal/asset-ticket-history-modal/asset-ticket-history-modal.component';
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
  private requestService = inject(AssetRequestService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private rbacService = inject(RbacService);
  private employeeService = inject(EmployeeService);
  private projectsService = inject(ProjectsService);

  assignedProjects: any[] = [];

  dispatchedTicket$: Observable<AssetRequestItem | undefined> = this.requestService.requests$.pipe(
    map(reqs => {
      if (this.isAdmin) return undefined;
      const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
      return reqs.find(r => {
        if (currentEmpId > 0 && r.employeeId !== currentEmpId) return false;
        const s = (r.status || '').toLowerCase().trim();
        const isFinished = s.includes('completed') || s.includes('closed') || s.includes('rejected') || s.includes('received');
        return !isFinished && (s.includes('dispatch') || s.includes('deliver'));
      });
    })
  );

  private dismissedRejectionIds$ = new BehaviorSubject<number[]>(this.getDismissedRejectionIds());

  private getDismissedRejectionIds(): number[] {
    try {
      const stored = localStorage.getItem('hrms_dismissed_rejection_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  dismissRejectedBanner(ticketId: number) {
    // 1. Immediately dismiss locally so UI responds instantly
    const current = this.getDismissedRejectionIds();
    if (!current.includes(ticketId)) {
      current.push(ticketId);
      try {
        localStorage.setItem('hrms_dismissed_rejection_ids', JSON.stringify(current));
      } catch {}
      this.dismissedRejectionIds$.next([...current]);
    }

    // 2. Persist to database so logout / login NEVER brings it back
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'Employee';

    this.requestService.requests$.pipe(take(1)).subscribe(reqs => {
      const rejectedReqs = reqs.filter(r => {
        if (currentEmpId && r.employeeId !== currentEmpId) return false;
        const s = (r.status || '').toLowerCase().trim();
        return s.includes('reject') && !s.includes('closed');
      });

      if (rejectedReqs.length === 0) return;

      const closeCalls = rejectedReqs.map(r => 
        this.requestService.updateStatus({
          requestId: r.id,
          newStatus: 'Closed',
          actionByEmployeeId: currentEmpId,
          actionByName: currentUserName,
          remarks: `Rejection notice acknowledged and closed by employee (${currentUserName}).`
        })
      );

      forkJoin(closeCalls).subscribe({
        next: () => {
          this.toastr.info('Rejection notice dismissed and archived.', 'Notice Dismissed');
          this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
          this.assetService.fetchAssetsFromApi();
        },
        error: (err) => {
          console.error('Error closing rejected tickets on backend:', err);
          this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
        }
      });
    });
  }

  rejectedTicket$: Observable<AssetRequestItem | undefined> = combineLatest([
    this.requestService.requests$,
    this.dismissedRejectionIds$
  ]).pipe(
    map(([reqs, dismissedIds]) => {
      if (this.isAdmin) return undefined;
      const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
      // Show the newest rejected ticket first
      const sorted = [...reqs].sort((a, b) => b.id - a.id);
      return sorted.find(r => {
        if (currentEmpId > 0 && r.employeeId !== currentEmpId) return false;
        const s = (r.status || '').toLowerCase().trim();
        const isRejected = s.includes('reject');
        // Do not display if not rejected, already closed, or dismissed
        if (!isRejected || s.includes('closed')) return false;
        return !dismissedIds.includes(r.id);
      });
    })
  );

  ticketCount$: Observable<number> = this.requestService.requests$.pipe(
    map(reqs => {
      if (this.isAdmin) return reqs.length;
      const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
      return reqs.filter(r => currentEmpId === 0 || r.employeeId === currentEmpId).length;
    })
  );

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

        // 1. If asset has a valid EmployeeId, it is the sole authority
        if (aEmpId > 0) {
          return currentEmpId > 0 && aEmpId === currentEmpId;
        }

        // 2. Legacy fallback only when asset has NO EmployeeId set
        if (a.assignedTo && a.assignedTo.trim() && a.assignedTo.toLowerCase() !== 'unassigned') {
          const assigned = a.assignedTo.toLowerCase().trim();
          const invalidPlaceholders = ['user profile', 'unassigned', 'undefined', 'null', 'employee'];
          if (invalidPlaceholders.includes(assigned)) {
            return false;
          }

          if (userName && !invalidPlaceholders.includes(userName) && assigned === userName) {
            return true;
          }
          if (fullName && !invalidPlaceholders.includes(fullName) && assigned === fullName) {
            return true;
          }
          if (userEmail && assigned === userEmail) {
            return true;
          }
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
    const currentEmpId = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? (Number(localStorage.getItem('employeeId')) || undefined)
      : undefined;
    this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
  }

  loadAssignedProjects() {
    const currentEmpId = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? (Number(localStorage.getItem('employeeId')) || 0)
      : 0;
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

  openDispatchedTracking(ticket: AssetRequestItem) {
    const assets = this.assetService.currentAssets;
    const asset = assets.find(a => Number(a.id) === ticket.assetId) || {
      id: String(ticket.assetId),
      modelName: ticket.assetName || ticket.assetModel || 'Corporate Asset',
      specifications: ticket.reason || ticket.defectReason || '',
      serialNumber: '',
      dateOfPurchase: '',
      assetType: 'Laptop',
      assignedTo: ticket.employeeName || 'You',
      location: 'Main Office',
      status: 'In Repair',
      isActive: false,
      lastAudit: ''
    } as AssetItem;

    const dialogRef = this.dialog.open(AssetTrackingModalComponent, {
      width: '680px',
      data: {
        asset,
        request: ticket,
        isAdmin: false
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
        this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
        this.assetService.fetchAssetsFromApi();
      }
    });
  }

  openTicketHistoryModal(initialFilter: 'all' | 'open' | 'completed' | 'rejected' = 'all') {
    const dialogRef = this.dialog.open(AssetTicketHistoryModalComponent, {
      width: '950px',
      maxWidth: '95vw',
      data: {
        isAdmin: this.isAdmin,
        initialFilter
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
      this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
      this.assetService.fetchAssetsFromApi();
    });
  }
}
