import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [CommonModule, AgGridAngular, AgGridModule],
  templateUrl: './holiday.component.html',
  styleUrl: './holiday.component.scss'
})
export class HolidayComponent {
  services = inject(HolidayservicesService)
  route = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "holidayName", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "description", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1 },
  ]
  rowData: any;

  ngOnInit() {
    this.services.getData().subscribe((response: any) => {
      this.rowData = response.data
    })
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
  };
}
