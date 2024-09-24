import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { MatIconModule } from '@angular/material/icon';
// import { IEmployee } from '../../interface/intrface';
import { ActionComponent } from '../action/action.component';
import { ModalComponent } from '../modal/modal.component';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { EmployeeService } from '../../services/employee/employee.service';



@Component({

  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [EmployeeService]
})

export class HomeComponent {
  service = inject(EmployeeService)
  router = inject(Router)
  // image = '/src/assets/images/download.jpg';

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "firstName", floatingFilter: true, filter: true, flex: 1 },
    { field: "lastName", floatingFilter: true, filter: true, flex: 1 },
    { field: "emailAddress", floatingFilter: true, filter: true, flex: 2 },
    { field: "mobileNumber", floatingFilter: true, filter: true, flex: 1 },
    { field: "permanentAddress", floatingFilter: true, filter: true, flex: 1 },
    { field: "gender", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off"></i>` },
    { field: "action", flex: 1, cellRenderer:ActionComponent }

  ]
  rowData: any;
  constructor() { this.columnDefs }

  ngOnInit() {
    this.service.getData().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
  };
  
}