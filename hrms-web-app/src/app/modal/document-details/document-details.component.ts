import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DocumentItem } from '../../interface/document.interface';

@Component({
  selector: 'app-document-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './document-details.component.html',
  styleUrl: './document-details.component.scss'
})
export class DocumentDetailsComponent {
  public dialogRef = inject(MatDialogRef<DocumentDetailsComponent>);
  public data: DocumentItem = inject(MAT_DIALOG_DATA);
  private toastr = inject(ToastrService);

  onClose() {
    this.dialogRef.close();
  }

  onDownload() {
    if (typeof window === 'undefined') return;

    if (this.data.fileUrl) {
      const a = document.createElement('a');
      a.href = this.data.fileUrl;
      a.download = this.data.name;
      a.click();
      this.toastr.success(`Downloading ${this.data.name}`);
      return;
    }

    if (this.data.file) {
      const url = URL.createObjectURL(this.data.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.data.name;
      a.click();
      URL.revokeObjectURL(url);
      this.toastr.success(`Downloading ${this.data.name}`);
      return;
    }

    let mimeType = 'application/octet-stream';
    if (this.data.fileType === 'pdf') mimeType = 'application/pdf';
    else if (this.data.fileType === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (this.data.fileType === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const content = `Document: ${this.data.name}\nCategory: ${this.data.category}\nOwner: ${this.data.ownerName}\nLast Modified: ${this.data.lastModified}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.data.name;
    a.click();
    URL.revokeObjectURL(url);
    this.toastr.success(`Downloading ${this.data.name}`);
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
