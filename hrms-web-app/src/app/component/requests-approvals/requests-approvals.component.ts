import { MatLabel } from '@angular/material/form-field';
import { Component, inject, OnInit } from '@angular/core';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { AttendanceRequestService } from '../../services/attenRequest/attendance-request.service';
import { EmailService } from '../../services/leaveRequest/email.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { RequestsApprovalsModalComponent} from '../../modal/requests-approvals-modal/requests-approvals-modal.component';
import { RequestActionComponent } from '../request-action/request-action.component';
import { stat } from 'fs';
@Component({
  selector: 'app-requests-approvals',
  standalone: true,
  imports: [MatTabsModule, AgGridAngular, AgGridModule,],
  templateUrl: './requests-approvals.component.html',
  styleUrl: './requests-approvals.component.scss'
})
export class RequestsApprovalsComponent implements OnInit {
  service = inject(EmailService)
  service2 = inject(AttendanceRequestService)
    dialog = inject(MatDialog)
        toaster = inject(ToastrService)
    
  
  rowData: [] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };
  currentTabIndex = 0;

  public leaveRequestColDef: ColDef[] = [
    {field : "fullName",headerName:"Requested By"},
    {field : "leaveMode",headerName:"Leave Mode"},
    
    {field : "leaveType.type",headerName:"Leave Type"},
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
    {field : "isApproved",headerName:"Is Approved"},
   { field: "action", cellRenderer: RequestActionComponent, cellRendererParams: { onSendRequest:(row: any, isApproved: boolean) =>  this.SendRequest(row, isApproved), } }
  ];
  public AttendanceRequestColDef: ColDef[] = [
    {field : "employeeName",headerName:"Requested By"},
    {field : "requestType",headerName:"Request Type"},
   {
      field: "requestedDate", headerName: 'Requested Date', valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    {
      field: "clockIn", headerName: 'ClockInTime', valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    {
      field: "clockOut", headerName: 'ClockOutTime', valueFormatter: params => {
        return params.value ? new Date(params.value).toLocaleDateString('en-GB') : '';
      }
    },
    { field: "reason", headerName: 'Reason', },
    {field : "status",headerName:"Status"},
    {field: "action", cellRenderer: RequestActionComponent, cellRendererParams: { onSendRequest:(row:any) =>  this.Edit(row), } }

  ];
  columnDefs: ColDef[] = this.leaveRequestColDef;
  ngOnInit(): void {
    this.onTabChanged({ index: 0 })
    this.callFirstTabAPI()
  }


    SendRequest(DesignationId: any, isApproved : boolean) {
      console.log("Test",DesignationId)
      const dialogRef = this.dialog.open(RequestsApprovalsModalComponent, {
        width: '350px',
        data:{ ...DesignationId , isApproved : isApproved}
      });
  
      dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.service.approveLeaveRequest({id:DesignationId.id , isApproved : isApproved}).subscribe({
            next: () => {
              this.toaster.success('Leave Request Approved Sucessfully', 'Delete');
              this.callFirstTabAPI()
            },
            error: () => {
              this.toaster.error('Failed To Approve The Record', 'Error');
            }
          });
        }
      });
    }
    
    Edit(DesignationId: any) 
    {
      console.log("Test",DesignationId)
      const dialogRef = this.dialog.open(RequestsApprovalsModalComponent, {
        width: '350px',
        data:{ ...DesignationId , status : DesignationId.status},
      });
      dialogRef.afterClosed().subscribe((confirmed: boolean) => 
        {
        if (confirmed) {
          DesignationId.status = "Approved"
          this.service2.updateData(DesignationId).subscribe({
            next: () => {
              this.toaster.success('Attendance Request Approved Sucessfully', 'Delete');
              this.callSecondTabAPI()
            },
            error: () => {
              this.toaster.error('Failed To Approve The Record', 'Error');
            }
          });
        }
      });
    }

 getData() {
    
  }
  onTabChanged(event: any) {
    this.currentTabIndex = event.index;
    switch (event.index) {
      case 0:
        this.columnDefs = this.leaveRequestColDef;
        this.callFirstTabAPI();
        break;

      case 1:
        this.columnDefs = this.AttendanceRequestColDef;
        this.callSecondTabAPI();
        break;

      case 2:
        this.callThirdTabAPI();
        break;
    }
  }
  callThirdTabAPI() { }
  callSecondTabAPI() {
        this.service2.getAllData().subscribe((response: any) => {
          this.rowData = response.data.map((x: any) => {
            console.log(x);
      return { 
        ...x,
      };
    });
    })
  }
  callFirstTabAPI() { 
      this.service.GetAllEmployeesLeaveRequest().subscribe((response: any) => {
            this.rowData = response.data.map((x: any) => {
        return { 
          ...x, 
          fullName: `${x.employee.firstName} ${x.employee.lastName}`,isApproved : x.isApproved ? 'YES':'NO' 
        };
      });
    })

  }
}
