import { Component } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-togglebutton',
  standalone: true,
  imports: [MatSlideToggleModule],
  templateUrl: './togglebutton.component.html',
  styleUrl: './togglebutton.component.scss'
})
export class TogglebuttonComponent implements ICellRendererAngularComp {
  public value!: string;
  agInit(params: ICellRendererParams) {

  }
  refresh(params: ICellRendererParams) {
    return true
  }
 
}
