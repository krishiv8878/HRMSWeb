import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
@Component({
  selector: 'app-action',
  standalone: true,
  imports: [MatIconModule],
  template: `<div class="button">
  <button class="edit"><mat-icon>edit</mat-icon></button> 
  <button class="delete"><mat-icon>delete</mat-icon></button>
  </div> `,
  styleUrl: './action.component.scss'
})
export class ActionComponent implements ICellRendererAngularComp {
  public value!: string;
  agInit(params: ICellRendererParams) { this.value = params.value }
  refresh(params: ICellRendererParams) { return true }
}
