import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from "ag-grid-angular";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { MatIconModule } from '@angular/material/icon';
// import { IEmployee } from '../../interface/intrface';
import { ActionComponent } from '../action/action.component';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../services/employee/employee.service';
import { EmployeeComponent } from '../../modal/employee/employee.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
// import { TogglebuttonComponent } from '../togglebutton/togglebutton.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})

export class HomeComponent {
  service = inject(EmployeeService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  toaster = inject(ToastrService)
  dialog = inject(MatDialog)

  public columnDefs: ColDef[] = [
    // { field: "id" },
    { field: "firstName", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "lastName", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "emailAddress", tooltipField: "emailAddress", minWidth: 300 },
    { field: "mobileNumber",minWidth: 200  },
    { field: "permanentAddress", tooltipField: "permanentAddress", headerName: "Per.Address",minWidth: 300  },
    { field: "currentAddress", tooltipField: "currentAddress", headerName: "Cur.Address",minWidth: 300  },
    {
      field: "dateOfJoining", headerName: 'Joinig Date',minWidth: 150 , valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    { field: "rolenames", headerName: 'Roles', tooltipField: "rolenames",minWidth: 200 },
    { field: "managerName", headerName: 'Managers', tooltipField: "managerName" ,minWidth: 300},
    { field: "gender", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "isActive", pinned: 'right',width: 100,cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    // { field: "isActive", cellRenderer: TogglebuttonComponent },
    { field: "action", cellRenderer: ActionComponent,pinned: 'right',width: 100, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) }, }
  ]

  rowData: any[] = [];

  constructor() { this.columnDefs }
  // employeeId!: any;
  // Id!: any;
  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.service.getData().subscribe((response: any) => {
      this.rowData = response.data;

      // this.rowData =[...response.employeedata.data, ...response.employeeRoles.data]
      console.log('rowww data', this.rowData)
    })
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };

  Edit(data: any) {
    const dialogRef = this.dialog.open(EmployeeComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getAllData();
      }
    })

  }

  Delete(employeeId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: employeeId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.service.DeleteData(employeeId).subscribe({
          next: () => {
            this.toaster.success('Employee Record Successfully Deleted ', 'Delete');
            this.getAllData();
          },
          error: () => {
            this.toaster.error('Failed To Delete The Record', 'Error');
          }
        });
      }
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(EmployeeComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getAllData();
        }
      }
    })
  }
}