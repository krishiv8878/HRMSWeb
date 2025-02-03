import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RolemastersComponent } from '../../modal/rolemasters/rolemasters.component';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';

@Component({
  selector: 'app-rolemaster',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule, MatButtonModule],
  templateUrl: './rolemaster.component.html',
  styleUrl: './rolemaster.component.scss'
})
export class RolemasterComponent {
  services = inject(RoleservicesService)
  dialog = inject(MatDialog)
  router = inject(Router)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    // { field: "id", floatingFilter: true, filter: true },
    { field: "clientName", floatingFilter: true, filter: true },
    { field: "clientRegion", floatingFilter: true, filter: true },
    { field: "projectName", floatingFilter: true, filter: true },
    { field: "description", floatingFilter: true, filter: true },
    { field: "createdDate", floatingFilter: true, filter: true },
    { field: "createdBy", floatingFilter: true, filter: true },
    { field: "updatedDate", floatingFilter: true, filter: true },
    { field: "updatedBy", floatingFilter: true, filter: true },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ];


  ngOnInit() {
    this.getData();
  }

  getData() {
    this.services.getAllData().subscribe((response: any) => {
      this.rowData = response.data;
      console.log(response)
    })
  }
  rowData: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  };

  Edit(data: any) {
    const dialogRef = this.dialog.open(RolemastersComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }
  
  Delete(DesignationId: any) {
    // console.log("delete employee dataaa", DesignationId)
    if (DesignationId != null) {
      this.services.DeleteData(DesignationId).subscribe(() => {
        DesignationId.isDeleted = true;
        DesignationId.isActive = false;

      })
      this.services.DeleteData(DesignationId).subscribe({
        next: (res) => {
          this.getData();
          this.toaster.success('successfully delete data', 'delete')
        }
      })
    }
  }

  openAddForm() {
    const dialogRef = this.dialog.open(RolemastersComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
