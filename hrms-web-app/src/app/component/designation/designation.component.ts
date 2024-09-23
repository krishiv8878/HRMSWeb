import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';


@Component({
  selector: 'app-designation',
  standalone: true,
  imports: [AgGridAngular, AgGridModule],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.scss'
})
export class DesignationComponent {
  constructor() { }

  services = inject(DesignationservicesService)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "designationName", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdBy", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
  ];

  ngOnInit() {
    this.services.getData().subscribe((response: any) => {
      this.rowData = response.data;
      console.log(response)
    })
  }
  rowData: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  };
}
