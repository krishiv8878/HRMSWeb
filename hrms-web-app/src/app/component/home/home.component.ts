import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef } from "ag-grid-community";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, AgGridModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  constructor() { }
  image = '/src/assets/images/download.jpg';

  public rowData: any[] | null = [
    { id: 1, firstname: "Toyota", lastname: "Celica", email: "example@getMaxListeners.com", address: "abc" },
    { id: 2, firstname: "Ford", lastname: "Mondeo", email: "example@getMaxListeners.com", address: "abc" },
    { id: 3, firstname: "Porsche", lastname: "Boxster", email: "example@getMaxListeners.com", address: "abc" },
    { id: 4, firstname: "BMW", lastname: "M50", email: "example@getMaxListeners.com", address: "abc" },
    { id: 5, firstname: "Aston Martin", lastname: "DBX", email: "example@getMaxListeners.com", address: "abc" },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    filter: true,
    // floatingFilter: true,
    editable: true
  };
  ColDefs: ColDef[] = [
    { field: "id", floatingFilter:true },
    { field: "firstname", floatingFilter:true },
    { field: "lastname", floatingFilter:true },
    { field: "email", floatingFilter:true },
    { field: "address", floatingFilter:true },
    { field: "action"}
  ]
}
