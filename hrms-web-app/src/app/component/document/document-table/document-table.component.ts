import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { DocumentItem } from '../../../interface/document.interface';
import { DocumentService } from '../../../services/documnets/document.service';
import { DocumentDetailsComponent } from '../../../modal/document-details/document-details.component';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './document-table.component.html',
  styleUrl: './document-table.component.scss'
})
export class DocumentTableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() documents: DocumentItem[] = [];

  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private searchSub?: Subscription;

  searchQuery: string = '';
  filteredDocuments: DocumentItem[] = [];

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedDocuments: DocumentItem[] = [];

  ngOnInit() {
    this.filterDocuments();

    this.searchSub = this.documentService.searchQuery$.subscribe(query => {
      this.searchQuery = query;
      this.filterDocuments();
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documents']) {
      this.filterDocuments();
    }
  }

  filterDocuments() {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.filteredDocuments = [...this.documents];
    } else {
      const q = this.searchQuery.toLowerCase().trim();
      this.filteredDocuments = this.documents.filter(doc =>
        doc.name.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.ownerName.toLowerCase().includes(q) ||
        doc.accessLevel.toLowerCase().includes(q) ||
        doc.fileType.toLowerCase().includes(q)
      );
    }

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
