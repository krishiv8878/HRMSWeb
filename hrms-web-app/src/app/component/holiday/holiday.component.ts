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
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './holiday.component.html',
  styleUrl: './holiday.component.scss',
})
export class HolidayComponent {
  services = inject(HolidayservicesService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    // { field: "id", },
    { field: "holidayName", },
    { field: "description", tooltipField: "description" },
    // { field: "createdDate", },
    // { field: "createdBy", },
    // { field: "updatedDate", },
    // { field: "updatedBy", },  
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    // { field: "isActive", cellRenderer: TogglebuttonComponent },

    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  constructor() { this.columnDefs }

  ngOnInit() {
    this.getHoliday();
  }

  getHoliday() {
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
    flex: 1,
    minWidth: 120,
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
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: holidayId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteHoliday(holidayId).subscribe({
          next: () => {
            this.toaster.success('Holiday Record Successfully Deleted ', 'Delete');
            this.getHoliday();
          },
          error: () => {
            this.toaster.error('Failed To Delete The Record', 'Error');
          }
        });
      }
    });
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
