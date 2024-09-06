import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule } from '@angular/common/http';
// import { IOlympicData } from '../../interface/intrface';

import { ActionComponent } from '../action/action.component';
import { ModalComponent } from '../modal/modal.component';

@Component({

  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, AgGridModule, MatIconModule, HttpClientModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'

})

export class HomeComponent {

  constructor(private http: HttpClient) { }
  image = '/src/assets/images/download.jpg';
  // public rowData!: IOlympicData[];
  // onGridReady(params: GridReadyEvent<IOlympicData>) {

  //   this.http.get < IOlympicData[] > ("https://www.ag-grid.com/example-assets/olympic-winners.json").subscribe((data) => (this.rowData = data));

  // }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  public rowData: any[] | null = [
    { id: 1, firstname: "Toyota", lastname: "Celica", email: "example@getMaxListeners.com", address: "abc" },
    { id: 2, firstname: "Ford", lastname: "Mondeo", email: "example@getMaxListeners.com", address: "abc" },
    { id: 3, firstname: "Porsche", lastname: "Boxster", email: "example@getMaxListeners.com", address: "abc" },
    { id: 4, firstname: "BMW", lastname: "M50", email: "example@getMaxListeners.com", address: "abc" },
    { id: 5, firstname: "Aston Martin", lastname: "DBX", email: "example@getMaxListeners.com", address: "abc" },

  ];

  defaultColDef: ColDef = {
    // flex:1
    // width:150,

  };

  ColDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "firstname", floatingFilter: true, filter: true, flex: 1 },
    { field: "lastname", floatingFilter: true, filter: true, flex: 1 },
    { field: "email", floatingFilter: true, filter: true, flex: 2 },
    { field: "address", floatingFilter: true, filter: true, flex: 1 },
    { field: "active", flex: 1, cellRenderer: ModalComponent },
    { field: "action", flex: 1, cellRenderer: ActionComponent }

  ]

  // public ColDefs: ColDef[] = [
  //   { field: "athlete", sort: "desc" },
  //   { field: "age", width: 90 },
  //   { field: "country" },
  //   { field: "year", width: 120, unSortIcon: true },
  //   { field: "date" },
  //   { field: "sport" },
  //   { field: "sport" },
  //   { field: "sport" },
  // ];
}
