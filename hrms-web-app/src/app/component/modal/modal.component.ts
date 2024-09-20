import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [MatSlideToggleModule],
  template: ` <button ><mat-slide-toggle></mat-slide-toggle></button>  `,
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements ICellRendererAngularComp {
  public value!: string;
  agInit(params: ICellRendererParams) { this.value = params.value }
  refresh(params: ICellRendererParams) { return true }

}
