import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DocumentService } from '../../services/documnets/document.service';
import { DocumentCategory, DocumentItem } from '../../interface/document.interface';
import { CategoryCardComponent } from './category-card/category-card.component';
import { DocumentTableComponent } from './document-table/document-table.component';
import { DocumentsComponent } from '../../modal/documents/documents.component';

@Component({
  selector: 'app-document',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    CategoryCardComponent,
    DocumentTableComponent
  ],
  templateUrl: './document.component.html',
  styleUrl: './document.component.scss'
})
export class DocumentComponent implements OnInit, OnDestroy {
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);

  categories: DocumentCategory[] = [];
  documents: DocumentItem[] = [];

  private sub = new Subscription();

  ngOnInit(): void {
    this.sub.add(
      this.documentService.categories$.subscribe(cats => {
        this.categories = cats;
      })
    );

    this.sub.add(
      this.documentService.documents$.subscribe(docs => {
        this.documents = docs;
      })
    );

    // Initial fetch from backend DB API
    this.documentService.fetchDocumentsFromApi();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onBrowseFolders(): void {
    console.log('Browse Folders clicked');
  }

  onUploadDocument(): void {
    const dialogRef = this.dialog.open(DocumentsComponent, {
      width: '560px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.documentService.fetchDocumentsFromApi();
      }
    });
  }
}
