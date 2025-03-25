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


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [EmployeeService]
})

export class HomeComponent {
  service = inject(EmployeeService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  toaster = inject(ToastrService)
  dialog = inject(MatDialog)

  public columnDefs: ColDef[] = [
    // { field: "id" },
    { field: "firstName" },
    { field: "lastName" },
    { field: "emailAddress" },
    { field: "mobileNumber" },
    { field: "permanentAddress" },
    {
      field: "dateOfJoining", valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    {field: "rolenames",headerName:'Roles' },
    { field: "managerName", headerName: 'Managers' },
    { field: "gender" },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    // { field: "isActive", cellRenderer: TogglebuttonComponent },

    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
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
      this.rowData = response.data.filter((employee: any) => employee.isActive)
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
    // console.log("delete employee dataaa", employeeId)
    if (employeeId != null) {
      this.service.DeleteData(employeeId).subscribe(() => {
        employeeId.isDeleted = true;
        employeeId.isActive = false;

      })
      this.service.DeleteData(employeeId).subscribe({
        next: (res) => {
          this.getAllData();
          this.toaster.error('successfully delete data', 'delete')
        }
      })
    }
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