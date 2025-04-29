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
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

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
    // { field: "id",},
    { field: "shiftName", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "startTime", },
    { field: "endTime", },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: [] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
  flex: 1,
    minWidth: 120,
  };
  ngOnInit() {
    this.getallData();
  }
  getallData() {
    this.services.getData().subscribe((responce: any) => {
      this.rowData = responce.data;
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

  Delete(DesignationId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: DesignationId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(DesignationId).subscribe({
          next: () => {
            this.toaster.success('Shift Record Successfully Deleted ', 'Delete');
            this.getallData();
          },
          error: () => {
            this.toaster.error('Failed To Delete The Record', 'Error');
          }
        });
      }
    });
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
