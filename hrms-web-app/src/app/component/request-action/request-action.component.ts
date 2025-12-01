import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
// import { EmployeeService } from '../../services/employee/employee.service';
// import { MatDialogModule } from '@angular/material/dialog'
import {MatDialogModule} from '@angular/material/dialog';
import { Console } from 'console';
@Component({
  selector: 'app-action',
  standalone: true,
  imports: [MatIconModule, MatDialogModule],
  template: `<div class="button">
  <button class="edit" (click)="onSendRequest(params.data,true)"><mat-icon>check</mat-icon></button>
  <button class="delete" (click)="onSendRequest(params.data,false)"><mat-icon>close</mat-icon></button>
  </div> `,
  styleUrl: './request-action.component.scss'
})
export class RequestActionComponent implements ICellRendererAngularComp {
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



  onSendRequest(data: any ,isApproved : boolean) {

    this.params.onSendRequest(this.params.data,isApproved)
  }
  
}

