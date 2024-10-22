import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ProjectsService } from '../../services/project/projects.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { ProjectComponent } from '../../modal/project/project.component';

@Component({
  selector: 'app-projectmaster',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, MatButtonModule],
  templateUrl: './projectmaster.component.html',
  styleUrl: './projectmaster.component.scss'
})
export class ProjectmasterComponent {
  services = inject(ProjectsService)
  dialog = inject(MatDialog)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "clientName", floatingFilter: true, filter: true, flex: 1 },
    { field: "clientRegion", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "createdBy", floatingFilter: true, filter: true, flex: 1 },
    { field: "updatedDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "projectName", floatingFilter: true, filter: true, flex: 1 },
    { field: "description", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    { field: "action", flex: 1, cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
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
    const dialogRef = this.dialog.open(ProjectComponent, {
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
        }
      })
    }
  }


  openAddForm() {
    const dialogRef = this.dialog.open(ProjectComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
