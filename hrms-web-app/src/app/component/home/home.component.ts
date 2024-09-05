import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef } from "ag-grid-community";
import { MatIconModule } from '@angular/material/icon';

@Component({

  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, AgGridModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'

})

export class HomeComponent {

  constructor() { }
  image = '/src/assets/images/download.jpg';

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
    flex: 1,
    // editable: true
  };

  ColDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true },
    { field: "firstname", floatingFilter: true, filter: true },
    { field: "lastname", floatingFilter: true, filter: true },
    { field: "email", floatingFilter: true, filter: true },
    { field: "address", floatingFilter: true, filter: true },
    {
      field: "active", cellRenderer: function () {
        return ` <div Click="handleClick()"><i class="material-icons"  style="font-size: 25px;">toggle_on</i></div>`
      }
    },
    {
      field: "action", cellRenderer: function () {
        return `<div class="button-icon">
                    <button style="color: white; background-color: blueviolet; outline: none; border: none; padding: 7px"><i class="material-icons"  style="font-size: 14px;">edit</i></button> 
                    <button style="color: white; background-color: red; outline: none; border: none;  padding: 7px"><i class="material-icons"  style="font-size: 14px;">delete</i></button>
              </div>`
      }
    }

  ]
}
