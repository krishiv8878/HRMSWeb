import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-assetsmaster',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule],
  templateUrl: './assetsmaster.component.html',
  styleUrl: './assetsmaster.component.scss'
})
export class AssetsmasterComponent {
  services = inject(AssetsmasterService)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "assetsMasterName", floatingFilter: true, filter: true, flex: 1 },
    { field: "serialNumber", floatingFilter: true, filter: true, flex: 1 },
    { field: "description", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", floatingFilter: true, filter: true, flex: 1 },
  ]

  rowData: any;

  ngOnInit() {
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
}
