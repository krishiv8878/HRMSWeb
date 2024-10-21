import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientModule } from '@angular/common/http';
import { HolidaysComponent } from '../../modal/holidays/holidays.component';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './holiday.component.html',
  styleUrl: './holiday.component.scss',
  providers: [HolidayservicesService]
})
export class HolidayComponent {
  services = inject(HolidayservicesService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  dialog = inject(MatDialog)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "holidayName", floatingFilter: true, filter: true, flex: 1 },
    { field: "description", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdBy", floatingFilter: true, filter: true, flex: 1 },
    { field: "updatedBy", floatingFilter: true, filter: true, flex: 1 },
    { field: "updatedDate", floatingFilter: true, filter: true, flex: 1 },

    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    // { field: "isActive", flex: 1, cellRenderer: TogglebuttonComponent },

    { field: "action", flex: 1, cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  constructor() { this.columnDefs }

  ngOnInit() {
    this.getHoliday();
   }

   getHoliday(){
    this.services.getHoliday().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }

  rowData: [] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
  };

  Edit(data: any) {
    const dialogRef = this.dialog.open(HolidaysComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getHoliday();
      }
    })

  }

  Delete(holidayId: any) {
    // console.log("delete employee dataaa", employeeId)
    if (holidayId != null) {
      this.services.DeleteHoliday(holidayId).subscribe(() => {
        holidayId.isDeleted = true;
        holidayId.isActive = false;
 
      })
      this.services.DeleteHoliday(holidayId).subscribe({
        next: (res) => {
          this.getHoliday();
        }
      })
    }
  }

  openHolidayForm() {
    const dialogRef = this.dialog.open(HolidaysComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getHoliday();
        }
      }
    })
}

  
}
