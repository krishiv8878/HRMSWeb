import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { LeaveComponent } from '../../modal/leave/leave.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-leavetype',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, MatButtonModule],
  templateUrl: './leavetype.component.html',
  styleUrl: './leavetype.component.scss'
})
export class LeavetypeComponent {
  services = inject(LeavetypeService)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true},
    { field: "leaveName", floatingFilter: true, filter: true},
    { field: "leaveType", floatingFilter: true, filter: true},
    { field: "createdBy", floatingFilter: true, filter: true},
    { field: "createdDate", floatingFilter: true, filter: true},
    { field: "updatedBy", floatingFilter: true, filter: true},
    { field: "updatedDate", floatingFilter: true, filter: true},
    { field: "description", floatingFilter: true, filter: true},
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ];

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
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
    const dialogRef = this.dialog.open(LeaveComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getAllData();
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
          this.getAllData();
          this.toaster.success('successfully delete data', 'delete')
        }
      })
    }
  }


  openAddForm() {
    const dialogRef = this.dialog.open(LeaveComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getAllData();
        }
      }
    })
  }

}
