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
import { ActionComponent } from '../action/action.component';
import { ToastrService } from 'ngx-toastr';
import { ProjectComponent } from '../../modal/project/project.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

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
    toaster = inject(ToastrService)
  rowData: any[] = [];

  public columnDefs: ColDef[] = [
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
    { field: "leaveReason", headerName: 'Reason', },
    { field: "leaveMode", headerName: 'Mode', },
    { field: "leaveTypeName", headerName: 'Leave Type', },
    { field: "isApproved", headerName: 'Status', valueGetter: params => params.data.approvedBy !=  0 ? params.data.isApproved ? 'Approved' : 'Rejected' : 'Pending',
       cellClassRules: {
    'status-approved': params => params.data.isApproved === true && params.data.approvedBy !=  0,
    'status-rejected': params => params.data.isApproved === false && params.data.approvedBy !=  0
  } },
      { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this), Delete: this.Delete.bind(this) } }
  
  ]

  ngOnInit() {
    this.getAllData();
  }
  Edit(data: any) {
    const dialogRef = this.dialog.open(LeaverequestComponent, {
       width: '600px',
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
       this.getAllData();
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
        this.services.DeleteData(DesignationId).subscribe({
          next: () => {
            this.toaster.success('Leave Request Deleted Sucessfully', 'Delete');
           this.getAllData();
          },
          error: () => {
            this.toaster.error('Failed To Delete The Record', 'Error');
          }
        });
      }
    });
  }
  getAllData() {
    this.rowData = []
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
  let dialogRef =  this.dialog.open(LeaverequestComponent, {
      width: '600px',
      // height: '100vh',
      // position: { right: '0px' },
    })

     dialogRef.afterClosed().subscribe({
      next: (val) => {
       this.getAllData();
      }
    })
  }
}
