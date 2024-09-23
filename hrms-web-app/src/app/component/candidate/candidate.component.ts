import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { CandidateService } from '../../services/candidate/candidate.service';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, CommonModule],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateComponent {
  services = inject(CandidateService)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "firstName", floatingFilter: true, filter: true, flex: 1 },
    { field: "lastName", floatingFilter: true, filter: true, flex: 1 },
    { field: "emailAddress", floatingFilter: true, filter: true, flex: 1 },
    { field: "mobileNumber", floatingFilter: true, filter: true, flex: 1 },
    { field: "totalExperience", floatingFilter: true, filter: true, flex: 1 },
    { field: "currentSalary", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1 },
  ]

  rowData: any;

  ngOnInit() {
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
}
