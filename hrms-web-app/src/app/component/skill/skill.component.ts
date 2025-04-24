import { Component, inject } from '@angular/core';
import { AgGridModule, AgGridAngular } from 'ag-grid-angular';
import { SkillservicesService } from '../../services/skill/skillservices.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { TogglebuttonComponent } from '../togglebutton/togglebutton.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SkillsComponent } from '../../modal/skills/skills.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

@Component({
  selector: 'app-skill',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './skill.component.html',
  styleUrl: './skill.component.scss',
  providers: [SkillservicesService]
})
export class SkillComponent {
  services = inject(SkillservicesService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    // { field: "id", floatingFilter: true, filter: true, flex: 1 },
    { field: "skillName", },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="font-size: x-large; color: red; "></i>` },
    //  { field: "isActive",  cellRenderer:TogglebuttonComponent },
    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } },

  ]

  constructor() { this.columnDefs }

  ngOnInit() {
    this.getSkill();
  }
  getSkill() {
    this.services.getSkill().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }
  rowData: [] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };

  Edit(data: any) {
    const dialogRef = this.dialog.open(SkillsComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getSkill();
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
        this.services.DeleteSkill(DesignationId).subscribe({
          next: () => {
            this.toaster.success('Skill Record Successfully Deleted ', 'Delete');
            this.getSkill();
          },
          error: () => {
            this.toaster.error('Failed to delete the record', 'Error');
          }
        });
      }
    });
  }


  openSkillForm() {
    const dialogRef = this.dialog.open(SkillsComponent);
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getSkill();
        }
      }
    })
  }
}
