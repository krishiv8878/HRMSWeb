import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { AssetItem, AssetStatus } from '../../../interface/asset.interface';
import { AssetsmasterService } from '../../../services/assetsmaster/assetsmaster.service';
import { AssetDetailsComponent } from '../../../modal/asset-details/asset-details.component';
import { AssetsmastersComponent } from '../../../modal/assetsmasters/assetsmasters.component';

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
export class AssetTableComponent implements OnInit, OnChanges {
  @Input() assets: AssetItem[] = [];

  private assetService = inject(AssetsmasterService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

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
  locations: string[] = ['All', 'NY Office - Floor 4', 'Storage Room B', 'Remote (UK)', 'SF Office - Floor 2', 'NY Office - Desk 42'];

  ngOnInit() {
    this.filterAssets();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['assets']) {
      this.filterAssets();
    }
  }

  filterAssets() {
    let result = [...this.assets];

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

  onDelete(id: string) {
    this.assetService.deleteAsset(id);
    this.toastr.warning(`Asset ${id} status changed to 'In Repair'`, 'Asset Status Updated');
  }

  getStatusPillClass(status: AssetStatus): string {
    switch (status) {
      case 'Active': return 'pill-active';
      case 'Available': return 'pill-available';
      case 'In Repair': return 'pill-repair';
      default: return 'pill-available';
    }
  }

  get startItemIndex(): number {
    if (this.filteredAssets.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredAssets.length);
  }
}
