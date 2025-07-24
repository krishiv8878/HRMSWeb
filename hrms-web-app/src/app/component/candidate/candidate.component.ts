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
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { error } from 'console';

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
    // { field: "id", floatingFilter: true, filter: true },
    { field: "firstName", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "lastName", valueFormatter: ({ value }) => value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '' },
    { field: "emailAddress", tooltipField: "emailAddress", minWidth: 300 },
    { field: "mobileNumber", },   
    { field: "totalExperience", headerName: 'Totla Exp' },
     { field: "relevantExperience", headerName: 'Relevant Exp' },
    { field: "currentSalary",headerName:"Curr Salary" },
    {field:'expectedSalary',headerName:"Exp Salary"},
    { field:"noticePeriod",headerName:"NoticeP"},
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]

  rowData: any;

  ngOnInit() {
    this.getData();
  }

  async getData() {
    await this.services.getData().then((responce: any) => {
      this.rowData = responce.data;
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
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: candidateId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteData(candidateId).then(
          () => {
            this.toaster.success('Candidate Record Successfully Deleted ', 'Delete');
            this.getData();
          }).catch(error => {
            this.toaster.error('Failed To Delete The Record', error);
          });
      }
    });

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
