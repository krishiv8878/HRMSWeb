import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { DocumentItem } from '../../../interface/document.interface';
import { DocumentService } from '../../../services/documnets/document.service';
import { DocumentDetailsComponent } from '../../../modal/document-details/document-details.component';
import { DeleteModalComponent } from '../../delete-modal/delete-modal.component';
import { RequestsApprovalsModalComponent } from '../../../modal/requests-approvals-modal/requests-approvals-modal.component';
import { RbacService } from '../../../core/rbac.service';
import { GlobalFilterService } from '../../../services/filter/global-filter.service';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './document-table.component.html',
  styleUrl: './document-table.component.scss'
})
export class DocumentTableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() documents: DocumentItem[] = [];

  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);
  private globalFilterService = inject(GlobalFilterService);
  private route = inject(ActivatedRoute);
  private searchSub?: Subscription;
  private globalFilterSub?: Subscription;
  private routeSub?: Subscription;

  activeStatusTab: 'Pending' | 'Approved' | 'Rejected' | 'All' = 'Pending';
  sortOrder: 'desc' | 'asc' = 'desc';

  pendingCount: number = 0;
  approvedCount: number = 0;
  rejectedCount: number = 0;
  totalCount: number = 0;

  searchQuery: string = '';
  selectedCategory: string = 'All';
  selectedOwner: string = 'All';

  categoryOptions: string[] = ['All'];
  ownerOptions: string[] = ['All'];

  filteredDocuments: DocumentItem[] = [];

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedDocuments: DocumentItem[] = [];

  ngOnInit() {
    this.updateCounts();
    this.updateFilterOptions();
    this.filterDocuments();

    this.searchSub = this.documentService.searchQuery$.subscribe(query => {
      this.searchQuery = query;
      this.filterDocuments();
    });

    this.globalFilterSub = this.globalFilterService.filters$.subscribe(f => {
      let changed = false;
      if (f.sortOrder && f.sortOrder !== this.sortOrder) {
        this.sortOrder = f.sortOrder;
        changed = true;
      }
      if (f.search !== undefined && f.search !== this.searchQuery) {
        this.searchQuery = f.search;
        changed = true;
      }
      if (changed) {
        this.filterDocuments();
      }
    });

    this.routeSub = this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam) {
        const normalized = tabParam.charAt(0).toUpperCase() + tabParam.slice(1).toLowerCase();
        if (normalized === 'Pending' || normalized === 'Approved' || normalized === 'Rejected' || normalized === 'All') {
          this.activeStatusTab = normalized as any;
          this.currentPage = 1;
          this.filterDocuments();
        }
      }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
    this.globalFilterSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documents']) {
      this.updateCounts();
      this.updateFilterOptions();
      this.filterDocuments();
    }
  }

  updateCounts(): void {
    if (!this.documents) return;
    this.totalCount = this.documents.length;
    this.pendingCount = this.documents.filter(d => (d.status || '').toLowerCase() === 'pending').length;
    this.approvedCount = this.documents.filter(d => (d.status || 'approved').toLowerCase() === 'approved').length;
    this.rejectedCount = this.documents.filter(d => (d.status || '').toLowerCase() === 'rejected').length;
  }

  setStatusTab(tab: 'Pending' | 'Approved' | 'Rejected' | 'All'): void {
    this.activeStatusTab = tab;
    this.currentPage = 1;
    this.filterDocuments();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.globalFilterService.setSortOrder(this.sortOrder);
    this.filterDocuments();
  }

  updateFilterOptions() {
    const cats = Array.from(new Set(this.documents.map(d => d.category).filter(Boolean))).sort();
    this.categoryOptions = ['All', ...cats];

    const owners = Array.from(new Set(this.documents.map(d => d.ownerName).filter(Boolean))).sort();
    this.ownerOptions = ['All', ...owners];
  }

  filterDocuments() {
    let result = [...this.documents];

    // Filter by Active Status Tab
    if (this.activeStatusTab !== 'All') {
      result = result.filter(doc => {
        const s = (doc.status || 'Approved').toLowerCase();
        return s === this.activeStatusTab.toLowerCase();
      });
    }

    if (this.selectedCategory !== 'All') {
      result = result.filter(doc => doc.category === this.selectedCategory);
    }

    if (this.selectedOwner !== 'All') {
      result = result.filter(doc => doc.ownerName === this.selectedOwner);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(doc =>
        (doc.name && doc.name.toLowerCase().includes(q)) ||
        (doc.category && doc.category.toLowerCase().includes(q)) ||
        (doc.ownerName && doc.ownerName.toLowerCase().includes(q)) ||
        (doc.accessLevel && doc.accessLevel.toLowerCase().includes(q)) ||
        (doc.fileType && doc.fileType.toLowerCase().includes(q))
      );
    }

    // Default Sorting: Latest first (descending), with sortOrder support
    const getTime = (doc: DocumentItem): number => {
      if (doc.lastModified) {
        const t = new Date(doc.lastModified).getTime();
        if (!isNaN(t)) return t;
      }
      const idNum = parseInt(doc.id, 10);
      return !isNaN(idNum) ? idNum : 0;
    };

    result.sort((a, b) => {
      const tA = getTime(a);
      const tB = getTime(b);
      const idA = parseInt(a.id, 10) || 0;
      const idB = parseInt(b.id, 10) || 0;

      if (this.sortOrder === 'asc') {
        return (tA - tB) || (idA - idB);
      } else {
        return (tB - tA) || (idB - idA);
      }
    });

    this.filteredDocuments = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  onSearchButtonClick() {
    this.filterDocuments();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredDocuments.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDocuments = this.filteredDocuments.slice(startIndex, endIndex);
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

  // Action 1: Open Document Viewer Modal
  onViewDetails(doc: DocumentItem) {
    this.dialog.open(DocumentDetailsComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: doc
    });
  }

  // Action 2: View / Open Document Viewer directly
  onViewDocument(doc: DocumentItem) {
    this.onViewDetails(doc);
  }

  // Action 3: Share Link
  onShareLink(doc: DocumentItem) {
    const shareUrl = `${window.location.origin}/index/document?docId=${doc.id}`;
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      this.toastr.success('Share link copied to clipboard!');
    } else {
      this.toastr.info(`Share URL: ${shareUrl}`);
    }
  }

  // Action 4: Toggle Active/Inactive Status (Don't delete in UI)
  onToggleActiveStatus(doc: DocumentItem) {
    const newStatus = this.documentService.toggleDocumentActive(doc.id);
    if (newStatus) {
      this.toastr.success(`Set status for "${doc.name}" to Active`);
    } else {
      this.toastr.warning(`Set status for "${doc.name}" to Inactive`);
    }
  }

  // Action 5: Download Document from Server
  onDownloadDocument(doc: DocumentItem) {
    const numericId = parseInt(doc.id.replace(/\D/g, ''), 10) || Number(doc.id);
    if (numericId > 0) {
      this.documentService.viewDocument(numericId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.name;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success(`Downloading ${doc.name}`, 'Download Started');
        },
        error: () => {
          this.onViewDocument(doc);
        }
      });
    } else {
      this.onViewDocument(doc);
    }
  }

  // Action 6: Delete Document with Confirmation Modal
  onDeleteDocument(doc: DocumentItem) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: doc.id }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.documentService.deleteDocument(doc.id).subscribe({
          next: () => {
            this.toastr.success(`Document "${doc.name}" successfully deleted`, 'Deleted');
          },
          error: () => {
            this.toastr.success(`Document "${doc.name}" successfully deleted`, 'Deleted');
          }
        });
      }
    });
  }

  // Action 7: Approve Document (HR / Admin)
  onApproveDocument(doc: DocumentItem) {
    this.documentService.approveOrRejectDocument(doc.id, 'Approved').subscribe({
      next: () => {
        this.toastr.success(`Document "${doc.name}" has been approved!`, 'Approved');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to approve document.';
        this.toastr.error(msg, 'Approval Error');
      }
    });
  }

  // Action 8: Reject Document with Reason (HR / Admin)
  onRejectDocument(doc: DocumentItem) {
    const dialogRef = this.dialog.open(RequestsApprovalsModalComponent, {
      width: '520px',
      data: {
        isApproved: false,
        documentName: doc.name,
        fullName: doc.ownerName,
        requestType: 'Document Verification'
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res && res.confirmed) {
        this.documentService.approveOrRejectDocument(doc.id, 'Rejected', res.rejectionReason).subscribe({
          next: () => {
            this.toastr.warning(`Document "${doc.name}" has been rejected.`, 'Rejected');
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to reject document.';
            this.toastr.error(msg, 'Rejection Error');
          }
        });
      }
    });
  }

  onShowRejectionReason(doc: DocumentItem) {
    this.dialog.open(DocumentDetailsComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: doc
    });
  }

  getStatusClass(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'badge-status-approved';
      case 'rejected': return 'badge-status-rejected';
      case 'pending': return 'badge-status-pending';
      default: return 'badge-status-approved';
    }
  }

  getStatusIcon(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'check_circle';
      case 'rejected': return 'cancel';
      case 'pending': return 'schedule';
      default: return 'check_circle';
    }
  }

  getFileBadgeClass(type: string): string {
    switch (type) {
      case 'pdf': return 'badge-pdf';
      case 'docx': return 'badge-docx';
      case 'xlsx': return 'badge-xlsx';
      default: return 'badge-generic';
    }
  }

  getAccessPillClass(access: string): string {
    switch (access) {
      case 'Restricted': return 'pill-restricted';
      case 'Public': return 'pill-public';
      case 'Private': return 'pill-private';
      default: return 'pill-private';
    }
  }

  get startItemIndex(): number {
    if (this.filteredDocuments.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDocuments.length);
  }
}
