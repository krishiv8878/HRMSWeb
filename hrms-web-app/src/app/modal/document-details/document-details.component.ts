import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DocumentItem } from '../../interface/document.interface';
import { DocumentService } from '../../services/documnets/document.service';

@Component({
  selector: 'app-document-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './document-details.component.html',
  styleUrl: './document-details.component.scss'
})
export class DocumentDetailsComponent implements OnInit, OnDestroy {
  public dialogRef = inject(MatDialogRef<DocumentDetailsComponent>);
  public data: DocumentItem = inject(MAT_DIALOG_DATA);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);
  private documentService = inject(DocumentService);

  safePreviewUrl: SafeResourceUrl | null = null;
  rawFileUrl: string | null = null;
  isLoadingPreview: boolean = true;
  private createdObjectURL: string | null = null;

  ngOnInit() {
    this.prepareDocumentPreview();
  }

  ngOnDestroy() {
    if (this.createdObjectURL && typeof window !== 'undefined') {
      URL.revokeObjectURL(this.createdObjectURL);
    }
  }

  prepareDocumentPreview() {
    if (typeof window === 'undefined') return;

    // 1. If file URL exists
    if (this.data.fileUrl) {
      this.rawFileUrl = this.data.fileUrl;
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.fileUrl);
      this.isLoadingPreview = false;
      return;
    }

    // 2. If uploaded File object exists
    if (this.data.file) {
      this.createdObjectURL = URL.createObjectURL(this.data.file);
      this.rawFileUrl = this.createdObjectURL;
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.createdObjectURL);
      this.isLoadingPreview = false;
      return;
    }

    // 3. Fetch Blob from Backend view API
    const docIdNum = Number(this.data.id);
    if (!isNaN(docIdNum) && docIdNum > 0) {
      this.documentService.viewDocument(docIdNum).subscribe({
        next: (blob: Blob) => {
          this.createdObjectURL = URL.createObjectURL(blob);
          this.rawFileUrl = this.createdObjectURL;
          this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.createdObjectURL);
          this.isLoadingPreview = false;
        },
        error: () => {
          // Generate fallback preview blob for inline viewing
          this.generateFallbackBlobPreview();
        }
      });
    } else {
      this.generateFallbackBlobPreview();
    }
  }

  private generateFallbackBlobPreview() {
    let content = `Document: ${this.data.name}\nCategory: ${this.data.category}\nOwner: ${this.data.ownerName}\nLast Modified: ${this.data.lastModified}`;
    const blob = new Blob([content], { type: 'text/plain' });
    this.createdObjectURL = URL.createObjectURL(blob);
    this.rawFileUrl = this.createdObjectURL;
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.createdObjectURL);
    this.isLoadingPreview = false;
  }

  onOpenInNewTab() {
    if (this.rawFileUrl && typeof window !== 'undefined') {
      window.open(this.rawFileUrl, '_blank');
      this.toastr.info(`Opening ${this.data.name} in new tab...`);
    } else {
      this.toastr.warning('Preview URL not available.');
    }
  }

  onClose() {
    this.dialogRef.close();
  }

  onShareLink() {
    const shareUrl = `${window.location.origin}/index/document?docId=${this.data.id}`;
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      this.toastr.success('Share link copied to clipboard!');
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
}
