import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { MatDialog } from '@angular/material/dialog';
import { AssetsmastersComponent } from '../../modal/assetsmasters/assetsmasters.component';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-assetsmaster',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule, MatButtonModule],
  templateUrl: './assetsmaster.component.html',
  styleUrl: './assetsmaster.component.scss'
})
export class AssetsmasterComponent {
  services = inject(AssetsmasterService)
  router = inject(Router)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true,},
    { field: "assetsMasterName", floatingFilter: true, filter: true,},
    { field: "serialNumber", floatingFilter: true, filter: true,},
    { field: "dateOfPurchase", floatingFilter: true, filter: true,},
    { field: "createdBy", floatingFilter: true, filter: true,},
    { field: "createdDate", floatingFilter: true, filter: true,},
    { field: "description", floatingFilter: true, filter: true,},
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: any;

  ngOnInit() {
    this.getData();
  }
  getData() {
    this.services.getData().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  }

  Edit(data: any) {
    const dialogRef = this.dialog.open(AssetsmastersComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();

      }
    })
  }

  Delete(AssetsMasterId: any) {
    if (AssetsMasterId != null) {
      this.services.DeleteData(AssetsMasterId).subscribe(() => {
        AssetsMasterId.isDeleted = true;
        AssetsMasterId.isActive = false;

      })
      this.services.DeleteData(AssetsMasterId).subscribe({
        next: (res) => {
          this.getData();
          this.toaster.success('successfully delete data', 'delete')
        }
      })
    }
  }

  openAddForm() {
    const dialogRef = this.dialog.open(AssetsmastersComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
