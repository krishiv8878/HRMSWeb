import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LeaverequestComponent } from '../../modal/leaverequest/leaverequest.component';
import { CommonModule } from '@angular/common';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientModule } from '@angular/common/http';
import { EmailService } from '../../services/leaveRequest/email.service';
import { ColDef } from 'ag-grid-community';
import { LeavetypeService } from '../../services/leave/leavetype.service';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatIconModule, HttpClientModule, AgGridModule, MatDialogModule, MatButtonModule],
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss'
})
export class LeaveRequestComponent {
  constructor() { this.columnDefs }
  services = inject(EmailService)
  leaveservices = inject(LeavetypeService)
  dialog = inject(MatDialog)
  rowData: any[] = [];

  public columnDefs: ColDef[] = [
    // { field: "emailAddress" },
    // { field: "type" },
    { field: "leaveTypeName" },
    {
      field: "startDate", headerName: 'From', valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    {
      field: "endDate", headerName: 'To', valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    { field: 'leaveMode' },
    { field: "leaveReson", headerName: 'Reason', },
    { field: "isApproved", headerName: 'Status' },
  ]

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.services.getData().subscribe((response: any) => {
      this.rowData = response.data;
      console.log('rowww data', this.rowData)
    })
  }

  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };

  openAddForm() {
    this.dialog.open(LeaverequestComponent, {
      width: '600px',
      // height: '100vh',
      // position: { right: '0px' },
    })
  }
}
