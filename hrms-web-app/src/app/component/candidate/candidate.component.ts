import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { CandidateService } from '../../services/candidate/candidate.service';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { MatDialog } from '@angular/material/dialog';
import { CandidateeComponent } from '../../modal/candidatee/candidate.component';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule, MatButtonModule],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateComponent {
  services = inject(CandidateService)
  router = inject(Router)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true },
    { field: "firstName", floatingFilter: true, filter: true },
    { field: "lastName", floatingFilter: true, filter: true },
    { field: "emailAddress", floatingFilter: true, filter: true },
    { field: "mobileNumber", floatingFilter: true, filter: true },
    { field: "totalExperience", floatingFilter: true, filter: true },
    { field: "currentSalary", floatingFilter: true, filter: true },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: any;

  ngOnInit() {
    this.getData();
  }

  getData() {
    this.services.getData().subscribe((responce: any) => {
      this.rowData = responce.data;
    })
  }
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
  };

  Edit(data: any) {
    const dialogRef = this.dialog.open(CandidateeComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }
  Delete(candidateId: any) {
    // console.log("delete employee dataaa", candidateId)
    if (candidateId != null) {
      this.services.DeleteData(candidateId).subscribe(() => {
        candidateId.isDeleted = true;
        candidateId.isActive = false;

      })
      this.services.DeleteData(candidateId).subscribe({
        next: (res) => {
          this.getData();
          this.toaster.success('successfully delete data', 'delete')
        }
      })
    }
  }
  openAddForm() {
    const dialogRef = this.dialog.open(CandidateeComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
