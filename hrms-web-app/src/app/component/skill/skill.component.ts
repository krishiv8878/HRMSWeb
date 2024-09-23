import { Component, inject } from '@angular/core';
import { AgGridModule, AgGridAngular } from 'ag-grid-angular';
import { SkillservicesService } from '../../services/skill/skillservices.service';
import { Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-skill',
  standalone: true,
  imports: [AgGridModule, AgGridAngular],
  templateUrl: './skill.component.html',
  styleUrl: './skill.component.scss'
})
export class SkillComponent {
  constructor() { }
  services = inject(SkillservicesService)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "skillName", floatingFilter: true, filter: true, flex: 1 },
    { field: "updatedBy", floatingFilter: true, filter: true, flex: 1 },
    { field: "updatedDate", floatingFilter: true, filter: true, flex: 1 },
    { field: "isActive", flex: 1, cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
  ]
  ngOnInit() {
    this.services.getData().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }
  rowData: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true
  };
}
