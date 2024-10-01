import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { EmployeeService } from '../../services/employee/employee.service';
import { MatDialogModule, MatDialog } from '@angular/material/dialog'

@Component({
  selector: 'app-action',
  standalone: true,
  imports: [MatIconModule, MatDialogModule],
  template: `<div class="button">
  <button class="edit" (click)="Edit(params.data)"><mat-icon>edit</mat-icon></button> 
  <button class="delete" ><mat-icon>delete</mat-icon></button>
  </div> `,
  styleUrl: './action.component.scss'
})
export class ActionComponent implements ICellRendererAngularComp {

  // http = inject(EmployeeService)
  // dialog = inject(MatDialog)
  public value!: string;
  data: any;
  // agInit(params: ICellRendererParams) { this.value = params.value }

  agInit(params: any): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams) { return true }
  params: any;

  Edit(data: any) {
    console.log(data)
   let user = this.params.onEdit(this.params.data)
    console.log("employee data",user)
  }
}

