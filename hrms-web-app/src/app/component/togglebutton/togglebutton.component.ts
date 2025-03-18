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
  params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }
  
  toggleStatus(): void {
    if (this.params && this.params.node && this.params.colDef?.field) {
      const newValue = !this.params.value;
      this.params.node.setDataValue(this.params.colDef.field, newValue);
    }
  }
  

  refresh(): boolean {
    return false;
  }
 
}
