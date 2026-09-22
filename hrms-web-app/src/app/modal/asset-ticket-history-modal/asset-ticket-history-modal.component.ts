import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AssetRequestItem } from '../../interface/asset-request.interface';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { AssetItem } from '../../interface/asset.interface';
import { AssetTrackingModalComponent } from '../asset-tracking-modal/asset-tracking-modal.component';

export interface AssetTicketHistoryModalData {
  isAdmin: boolean;
  initialFilter?: 'all' | 'open' | 'completed' | 'rejected';
}

@Component({
  selector: 'app-asset-ticket-history-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './asset-ticket-history-modal.component.html',
  styleUrl: './asset-ticket-history-modal.component.scss'
})
export class AssetTicketHistoryModalComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AssetTicketHistoryModalComponent>);
  public data: AssetTicketHistoryModalData = inject(MAT_DIALOG_DATA) || { isAdmin: false };
  private requestService = inject(AssetRequestService);
  private assetService = inject(AssetsmasterService);
  private dialog = inject(MatDialog);

  allTickets: AssetRequestItem[] = [];
  filteredTickets: AssetRequestItem[] = [];
  searchQuery: string = '';
  selectedEmployee: string = 'All';
  employeeOptions: string[] = [];
  activeTab: 'all' | 'open' | 'completed' | 'rejected' = this.data.initialFilter || 'all';

  ngOnInit(): void {
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
    this.requestService.fetchRequests(this.data.isAdmin ? undefined : currentEmpId).subscribe({
      next: () => {
        this.loadTickets();
      }
    });

    this.requestService.requests$.subscribe(reqs => {
      this.allTickets = reqs;
      this.updateEmployeeOptions();
      this.applyFilters();
    });
  }

  loadTickets(): void {
    this.requestService.fetchRequests(this.data.isAdmin ? undefined : (Number(localStorage.getItem('employeeId')) || undefined)).subscribe(res => {
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        this.allTickets = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
        this.updateEmployeeOptions();
        this.applyFilters();
      }
    });
  }

  updateEmployeeOptions(): void {
    const set = new Set<string>();
    for (const t of this.allTickets) {
      const name = (t.employeeName || '').trim();
      if (name) {
        set.add(name);
      }
    }
    this.employeeOptions = Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  setTab(tab: 'all' | 'open' | 'completed' | 'rejected'): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allTickets];

    // Employee Filter
    if (this.selectedEmployee && this.selectedEmployee !== 'All') {
      const empFilter = this.selectedEmployee.toLowerCase().trim();
      result = result.filter(r => (r.employeeName || '').toLowerCase().trim() === empFilter);
    }

    // Status Tab Filter
    if (this.activeTab === 'open') {
      result = result.filter(r => {
        const s = (r.status || '').toLowerCase();
        return !s.includes('completed') && !s.includes('closed') && !s.includes('rejected');
      });
    } else if (this.activeTab === 'completed') {
      result = result.filter(r => {
        const s = (r.status || '').toLowerCase();
        return s.includes('completed') || s.includes('closed') || s.includes('received');
      });
    } else if (this.activeTab === 'rejected') {
      result = result.filter(r => {
        const s = (r.status || '').toLowerCase();
        return s.includes('reject');
      });
    }

    // Search query filter
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        String(r.id).includes(q) ||
        (r.assetModel && r.assetModel.toLowerCase().includes(q)) ||
        (r.assetName && r.assetName.toLowerCase().includes(q)) ||
        (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
        (r.requestType && r.requestType.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.adminRemarks && r.adminRemarks.toLowerCase().includes(q)) ||
        (r.trackingNumber && r.trackingNumber.toLowerCase().includes(q))
      );
    }

    this.filteredTickets = result;
  }

  get totalCount(): number {
    return this.allTickets.length;
  }

  get openCount(): number {
    return this.allTickets.filter(r => {
      const s = (r.status || '').toLowerCase();
      return !s.includes('completed') && !s.includes('closed') && !s.includes('rejected');
    }).length;
  }

  get completedCount(): number {
    return this.allTickets.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('completed') || s.includes('closed') || s.includes('received');
    }).length;
  }

  get rejectedCount(): number {
    return this.allTickets.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('reject');
    }).length;
  }

  openTicketDetails(ticket: AssetRequestItem): void {
    const assets = this.assetService.currentAssets;
    const asset = assets.find(a => Number(a.id) === ticket.assetId) || {
      id: String(ticket.assetId),
      modelName: ticket.assetName || ticket.assetModel || 'Corporate Asset',
      specifications: ticket.reason || ticket.defectReason || '',
      serialNumber: '',
      dateOfPurchase: '',
      assetType: 'Laptop',
      assignedTo: ticket.employeeName || 'Assigned User',
      location: 'Main Office',
      status: ticket.status.includes('Completed') ? 'Active' : 'In Repair',
      isActive: true,
      lastAudit: ''
    } as AssetItem;

    const dialogRef = this.dialog.open(AssetTrackingModalComponent, {
      width: '680px',
      data: {
        asset,
        request: ticket,
        isAdmin: this.data.isAdmin
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
      this.requestService.fetchRequests(this.data.isAdmin ? undefined : currentEmpId).subscribe();
      this.assetService.fetchAssetsFromApi();
    });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('reject')) return 'status-rejected';
    if (s.includes('completed') || s.includes('received')) return 'status-completed';
    if (s.includes('dispatch') || s.includes('transit') || s.includes('pickup')) return 'status-transit';
    if (s.includes('repair')) return 'status-repair';
    if (s.includes('approved')) return 'status-approved';
    return 'status-pending';
  }

  getStatusIcon(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('reject')) return 'cancel';
    if (s.includes('completed')) return 'check_circle';
    if (s.includes('received')) return 'inventory';
    if (s.includes('dispatch') || s.includes('transit') || s.includes('pickup')) return 'local_shipping';
    if (s.includes('repair')) return 'build';
    if (s.includes('approved')) return 'thumb_up';
    return 'schedule';
  }

  close(): void {
    this.dialogRef.close();
  }
}
