import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { AssetItem, AssetStatus } from '../../../interface/asset.interface';
import { AssetsmasterService } from '../../../services/assetsmaster/assetsmaster.service';
import { AssetRequestService } from '../../../services/asset-request/asset-request.service';
import { AssetRequestItem, AssetRequestType } from '../../../interface/asset-request.interface';
import { AssetDetailsComponent } from '../../../modal/asset-details/asset-details.component';
import { AssetsmastersComponent } from '../../../modal/assetsmasters/assetsmasters.component';
import { AssetRequestModalComponent } from '../../../modal/asset-request-modal/asset-request-modal.component';
import { AssetTrackingModalComponent } from '../../../modal/asset-tracking-modal/asset-tracking-modal.component';
import { DeleteModalComponent } from '../../delete-modal/delete-modal.component';
import { RbacService } from '../../../core/rbac.service';

@Component({
  selector: 'app-asset-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './asset-table.component.html',
  styleUrl: './asset-table.component.scss'
})
export class AssetTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() assets: AssetItem[] = [];

  private assetService = inject(AssetsmasterService);
  private requestService = inject(AssetRequestService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private rbacService = inject(RbacService);

  assetRequests: AssetRequestItem[] = [];
  private reqSub?: Subscription;

  get isAdmin(): boolean {
    return this.rbacService.isAdmin();
  }

  searchQuery: string = '';
  selectedCategory: string = 'All';
  selectedStatus: string = 'All';
  selectedLocation: string = 'All';

  filteredAssets: AssetItem[] = [];

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedAssets: AssetItem[] = [];

  categories: string[] = ['All', 'Laptop', 'Monitor', 'Tablet', 'Furniture', 'Peripherals'];
  statuses: string[] = ['All', 'Active', 'Available', 'In Repair'];
  locations: string[] = ['All'];

  ngOnInit() {
    this.filterAssets();

    this.reqSub = this.requestService.requests$.subscribe(reqs => {
      this.assetRequests = reqs;
    });

    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
    this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
  }

  ngOnDestroy() {
    this.reqSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['assets']) {
      this.filterAssets();
    }
  }

  filterAssets() {
    let result = [...this.assets];

    // Build dynamic locations list
    const locSet = new Set(this.assets.map(a => a.location).filter(Boolean));
    this.locations = ['All', ...Array.from(locSet)];

    // Search query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        a.id.toLowerCase().includes(q) ||
        a.modelName.toLowerCase().includes(q) ||
        a.specifications.toLowerCase().includes(q) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(q)) ||
        a.location.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (this.selectedCategory !== 'All') {
      result = result.filter(a => a.assetType === this.selectedCategory);
    }

    // Status filter
    if (this.selectedStatus !== 'All') {
      result = result.filter(a => a.status === this.selectedStatus);
    }

    // Location filter
    if (this.selectedLocation !== 'All') {
      result = result.filter(a => a.location === this.selectedLocation);
    }

    this.filteredAssets = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredAssets.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedAssets = this.filteredAssets.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  openViewDetails(asset: AssetItem) {
    this.dialog.open(AssetDetailsComponent, {
      width: '520px',
      data: asset
    });
  }

  openEditAsset(asset: AssetItem) {
    if (!this.isAdmin) return;
    const dialogRef = this.dialog.open(AssetsmastersComponent, {
      width: '560px',
      data: asset
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.assetService.recalculateMetrics();
      }
    });
  }

  onSendToRepair(id: string) {
    if (!this.isAdmin) return;
    this.assetService.sendToRepair(id);
    this.toastr.warning(`Asset ${id} status updated to 'In Repair'`, 'Sent to Repair');
  }

  onDelete(id: string) {
    if (!this.isAdmin) return;
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.assetService.deleteAsset(id);
        this.toastr.success(`Asset record ${id} removed from database`, 'Asset Deleted');
      }
    });
  }

  getStatusPillClass(status: AssetStatus): string {
    switch (status) {
      case 'Active': return 'pill-active';
      case 'Available': return 'pill-available';
      case 'In Repair': return 'pill-repair';
      default: return 'pill-available';
    }
  }

  getActiveRequest(asset: AssetItem): AssetRequestItem | undefined {
    const numericId = typeof asset.id === 'string' ? parseInt(asset.id.replace(/\D/g, ''), 10) : Number(asset.id);
    const assetEmpId = asset.employeeId ? Number(asset.employeeId) : undefined;
    const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;

    return this.assetRequests.find(r => {
      // Must match exact asset ID
      if (Number(r.assetId) !== numericId) return false;

      // In employee view, must match current employee
      if (!this.isAdmin && currentEmpId > 0 && r.employeeId !== currentEmpId) return false;

      // In admin view, if asset is assigned to someone, only match tickets for currently assigned employee
      if (this.isAdmin && assetEmpId && assetEmpId > 0 && r.employeeId !== assetEmpId) return false;

      // If asset is Available / Unassigned, previous employee tickets shouldn't be active
      if (asset.status === 'Available') return false;

      // Check if ticket is still active / in-progress
      const s = (r.status || '').toLowerCase().trim();
      const isFinished = s.includes('completed') || s.includes('closed') || s.includes('rejected') || s.includes('received');
      return !isFinished;
    });
  }

  getLatestRequest(asset: AssetItem): AssetRequestItem | undefined {
    const numericId = typeof asset.id === 'string' ? parseInt(asset.id.replace(/\D/g, ''), 10) : Number(asset.id);
    const currentEmpId = Number(localStorage.getItem('employeeId')) || 0;
    const assetEmpId = Number(asset.employeeId) || 0;

    return this.assetRequests.find(r => {
      if (Number(r.assetId) !== numericId) return false;
      if (!this.isAdmin && currentEmpId > 0 && r.employeeId !== currentEmpId) return false;
      if (this.isAdmin && assetEmpId && assetEmpId > 0 && r.employeeId !== assetEmpId) return false;
      return true;
    });
  }

  isLatestRequestRejected(asset: AssetItem): boolean {
    const active = this.getActiveRequest(asset);
    if (active) return false;
    const latest = this.getLatestRequest(asset);
    if (!latest) return false;
    const s = (latest.status || '').toLowerCase().trim();
    return s.includes('reject');
  }

  getTicketBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('dispatch') || s.includes('transit')) return 'badge-dispatched';
    if (s.includes('deliver')) return 'badge-delivered';
    if (s.includes('repair')) return 'badge-repair';
    if (s.includes('approved')) return 'badge-approved';
    if (s.includes('submitted') || s.includes('requested') || s.includes('initiated')) return 'badge-submitted';
    if (s.includes('reject')) return 'badge-rejected';
    return 'badge-default';
  }

  getTicketIcon(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('dispatch') || s.includes('transit')) return 'local_shipping';
    if (s.includes('deliver')) return 'markunread_mailbox';
    if (s.includes('repair')) return 'build';
    if (s.includes('approved')) return 'thumb_up';
    if (s.includes('submitted') || s.includes('requested') || s.includes('initiated')) return 'schedule';
    if (s.includes('reject')) return 'cancel';
    return 'info';
  }

  openRequestModal(asset: AssetItem, defaultType: AssetRequestType = 'Repair') {
    const dialogRef = this.dialog.open(AssetRequestModalComponent, {
      width: '620px',
      data: { asset, defaultType }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;
        this.requestService.fetchRequests(this.isAdmin ? undefined : currentEmpId).subscribe();
        this.assetService.fetchAssetsFromApi();
      }
    });
  }

  openTrackModal(asset: AssetItem) {
    const req = this.getActiveRequest(asset) || this.getLatestRequest(asset);
    if (!req) return;

    const dialogRef = this.dialog.open(AssetTrackingModalComponent, {
      width: '680px',
      data: {
        asset,
        request: req,
        isAdmin: this.isAdmin
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

  canConfirmReceipt(asset: AssetItem): boolean {
    const req = this.getActiveRequest(asset);
    if (!req || this.isAdmin) return false;
    const s = (req.status || '').toLowerCase();
    return s.includes('dispatch') || s.includes('deliver');
  }

  get startItemIndex(): number {
    if (this.filteredAssets.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredAssets.length);
  }
}
