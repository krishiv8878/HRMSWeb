import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { MatDialog } from '@angular/material/dialog';
import { DesignationsComponent } from '../../modal/designations/designations.component';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-designation',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, MatButtonModule],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.scss'
})
export class DesignationComponent {
  constructor() { }

  services = inject(DesignationservicesService)
  router = inject(Router)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true },
    { field: "designationName", floatingFilter: true, filter: true },
    { field: "createdDate", floatingFilter: true, filter: true },
    { field: "createdBy", floatingFilter: true, filter: true },
    { field: "updatedBy", floatingFilter: true, filter: true },
    { field: "updatedDate", floatingFilter: true, filter: true },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ];

  ngOnInit() {
    this.getData();
  }

  getData() {
    this.services.getData().subscribe((response: any) => {
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
    const dialogRef = this.dialog.open(DesignationsComponent, {
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
    const dialogRef = this.dialog.open(DesignationsComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
