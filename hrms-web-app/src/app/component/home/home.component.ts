import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef } from "ag-grid-community";
import { MatIconModule } from '@angular/material/icon';
import { IEmployee } from '../../interface/intrface';
import { ActionComponent } from '../action/action.component';
import { ModalComponent } from '../modal/modal.component';
import { HttpClientModule } from '@angular/common/http';
import { EmployeeserviceService } from '../../services/employeeservice.service';


@Component({

  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, AgGridModule, MatIconModule, HttpClientModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [EmployeeserviceService]
})

export class HomeComponent {


  // image = '/src/assets/images/download.jpg';

  public ColDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "firstname", floatingFilter: true, filter: true, flex: 1 },
    { field: "lastname", floatingFilter: true, filter: true, flex: 1 },
    { field: "email", floatingFilter: true, filter: true, flex: 2 },
    { field: "address", floatingFilter: true, filter: true, flex: 1 },
    { field: "active", flex: 1, cellRenderer: ModalComponent },
    { field: "action", flex: 1, cellRenderer: ActionComponent }

  ]
  public rowData: IEmployee[] = [];
  constructor(private service: EmployeeserviceService) { }

  ngOnInit() {
    this.service.getAllemployee().subscribe((data) => {
      // this.rowData = data;
       console.log(data)
      if (Array.isArray(data)) {
       ( this.rowData = data)
      } else {
        console.error('Expected an array, but got:', data);
      }
    });
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  };
}
