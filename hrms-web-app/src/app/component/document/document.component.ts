import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../services/documnets/document.service';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { DocumentsComponent } from '../../modal/documents/documents.component';
@Component({
  selector: 'app-document',
  standalone: true,
  imports: [CommonModule, MatCardModule, AgGridModule, MatListModule, MatIconModule, HttpClientModule, MatButtonModule],
  templateUrl: './document.component.html',
  styleUrl: './document.component.scss'
})
export class DocumentComponent {
  constructor() { }
  route = inject(ActivatedRoute)
  dialog = inject(MatDialog)
  services = inject(DocumentService)
  sanitizer = inject(DomSanitizer);
  public columnDefs: ColDef[] = [

    // { field: 'id' },
    // { field: 'employeeId' },
    { field: 'filePath', headerName: "Employee Document" },
    // { field: 'isActive', cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>`  },
  ]

  rowData: any[] = [];
  documents: any[] = [];
  selectedDocument: SafeResourceUrl | null = null;

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };

  ngOnInit() {
    this.AllData();
  }
  AllData() {
    this.services.getAll().then((response: any) => {
      this.documents = response.data
      console.log("data", response.data)
    })
  }

  viewDocument(id: number) {
    console.log("Selected Document ID:", id); // Debugging ke liye

    this.services.viewDocument(id).then((response: any) => {
      const url = window.URL.createObjectURL(response);
      this.selectedDocument = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }, error => {
      console.error("Error loading document:", error);
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(DocumentsComponent);

    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.AllData();
        }
      }    
    });
  }
}
