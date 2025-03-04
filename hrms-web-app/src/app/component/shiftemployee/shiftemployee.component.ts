import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { EmployeeshiftService } from '../../services/shift/employeeshift.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { ShiftComponent } from '../../modal/shift/shift.component';

@Component({
  selector: 'app-shiftemployee',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule, MatButtonModule],
  templateUrl: './shiftemployee.component.html',
  styleUrl: './shiftemployee.component.scss'
})
export class ShiftemployeeComponent {
  services = inject(EmployeeshiftService)
  dialog = inject(MatDialog)
  router = inject(Router)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    // { field: "id", floatingFilter: true, filter: true },
    { field: "shiftName", floatingFilter: true, filter: true },
    { field: "startTime", floatingFilter: true, filter: true },
    { field: "endTime", floatingFilter: true, filter: true },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  };
  ngOnInit() {
    this.getallData();
  }
  getallData() {
    this.services.getData().subscribe((responce: any) => {
      this.rowData = responce.data.filter((shift:any)=>shift.isActive);
    })
  }
  Edit(data: any) {
    const dialogref = this.dialog.open(ShiftComponent, {
      data,
    })
    dialogref.afterClosed().subscribe({
      next: (val) => {
        this.getallData();
      }
    })
  }
  Delete(shiftId: any) {
    console.log("delete employee dataaa", shiftId)
    if (shiftId != null) {
      this.services.deleteData(shiftId).subscribe(() => {
        shiftId.isDeleted = true;
        shiftId.isActive = false;

      })
      this.services.deleteData(shiftId).subscribe({
        next: (res) => {
          this.getallData();
          this.toaster.success('successfully delete data', 'delete')
        }
      })
    }
  }
  openAddForm() {
    const dialogref = this.dialog.open(ShiftComponent)
    dialogref.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getallData();
        }
      }
    })
  }
}
