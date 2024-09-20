import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { EmployeeService } from '../../services/employee/employee.service';

@Component({
  selector: 'app-action',
  standalone: true,
  imports: [MatIconModule],
  template: `<div class="button">
  <button class="edit" (click)="onEdit()"><mat-icon>edit</mat-icon></button> 
  <button class="delete" ><mat-icon>delete</mat-icon></button>
  </div> `,
  styleUrl: './action.component.scss'
})
export class ActionComponent implements ICellRendererAngularComp {
  http = inject(EmployeeService)

  public value!: string;
  agInit(params: ICellRendererParams) { this.value = params.value }
  refresh(params: ICellRendererParams) { return true }
 

  onEdit() {
    
  }

  onDeleteRow() {
    // this.params.deleteRow(this.params.node.data.id)
  }
}
