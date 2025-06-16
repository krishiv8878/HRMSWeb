import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { PaymeenInfoComponent } from '../../modal/paymeen-info/paymeen-info.component';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

@Component({
  selector: 'app-paymentinfo',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './paymentinfo.component.html',
  styleUrl: './paymentinfo.component.scss'
})
export class PaymentinfoComponent {
  constructor() { }
  services = inject(PaymentinfoService)
  router = inject(Router)
  route = inject(ActivatedRoute)
  dialog = inject(MatDialog)
  toaster = inject(ToastrService)

  public columnDefs: ColDef[] = [
    // { field: "id",  },
    { field: "employeeId", },
    { field: "bankName", },
    { field: "ifscCode", },
    { field: "accountNumber", },
    { field: "nameOnAccount", },
    { field: "isActive", cellRenderer: (params: ICellRendererParams) => params.value ? `<i class="fa-solid fa-toggle-on" style="color: green; font-size: x-large;"></i>` : `'<i class="fa-solid fa-toggle-off" style="color: red; font-size: x-large;"></i>` },
    // { field: "isActive", cellRenderer: TogglebuttonComponent },

    { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  ]
  employeeId: any;
  rowData: any[] = [];
  ngOnInit() {
    const storeID = localStorage.getItem('employeeId')
    if (storeID) {
      this.employeeId = storeID;
       console.log(this.employeeId,'payement iddd')
      this.getData()
    } else {
      console.error("No payment ID found in localStorage.");
    }

  }

  getData() {
    this.services.getAllData().subscribe((response: any) => {
      this.rowData = response.data;
    })
  }

  Edit(payment: any) {
    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '500px',
      data: payment
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  Delete(paymentId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: paymentId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(paymentId).subscribe({
          next: () => {
            this.toaster.success('Record successfully Deleted ', 'Delete');
            this.getData();
          },
          error: () => {
            this.toaster.error('Failed To Delete The Record', 'Error');
          }
        });
      }
    });
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 150,
  };
  openAddForm() {
    const dialogRef = this.dialog.open(PaymeenInfoComponent)
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        if (val) {
          this.getData();
        }
      }
    })
  }
}
