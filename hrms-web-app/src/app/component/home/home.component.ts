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
import { IndexComponent } from "../index/index.component";


@Component({

  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule, IndexComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [EmployeeService]
})

export class HomeComponent {
  service = inject(EmployeeService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  // image = '/src/assets/images/download.jpg';
  dialog = inject(MatDialog)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "firstName", floatingFilter: true, filter: true, flex: 1 },
    { field: "lastName", floatingFilter: true, filter: true, flex: 1 },
    { field: "emailAddress", floatingFilter: true, filter: true, flex: 2 },
    { field: "mobileNumber", floatingFilter: true, filter: true, flex: 1 },
    { field: "permanentAddress", floatingFilter: true, filter: true, flex: 1 },
    { field: "dateOfJoining", floatingFilter: true, filter: true, flex: 1 },
    { field: "gender", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    // { field: "isActive", flex: 1, cellRenderer: TogglebuttonComponent },

    { field: "action", flex: 1, cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: [] = [];

  constructor() { this.columnDefs }
  // employeeId!: any;
  // Id!: any;
  ngOnInit() {
    this.getAllData();

  }

  getAllData() {
    this.service.getAllData().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
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