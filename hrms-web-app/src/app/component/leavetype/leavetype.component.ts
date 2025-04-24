import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { LeaveComponent } from '../../modal/leave/leave.component';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

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
    // { field: "id",},
    // { field: "leaveName",},
    { field: "type",valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "description",tooltipField:"description"},
    // { field: "createdDate",},
    // { field: "createdBy",},
    // { field: "updatedDate",},
    // { field: "updatedBy",},
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
    resizable: true,
    flex: 1,
    minWidth: 120,
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
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: DesignationId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteData(DesignationId).subscribe({
          next: () => {
            this.toaster.success('Leave Record Successfully Deleted ', 'Delete');
            this.getAllData();
          },
          error: () => {
            this.toaster.error('Failed to delete the record', 'Error');
          }
        });
      }
    });
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
