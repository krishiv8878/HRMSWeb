import { MatLabel } from '@angular/material/form-field';
import { Component, inject, OnInit } from '@angular/core';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionComponent } from '../action/action.component';
import { LeavetypeService } from '../../services/leave/leavetype.service';
import { EmailService } from '../../services/leaveRequest/email.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { RequestsApprovalsModalComponent} from '../../modal/requests-approvals-modal/requests-approvals-modal.component';
import { RequestActionComponent } from '../request-action/request-action.component';
@Component({
  selector: 'app-requests-approvals',
  standalone: true,
  imports: [MatTabsModule, AgGridAngular, AgGridModule,],
  templateUrl: './requests-approvals.component.html',
  styleUrl: './requests-approvals.component.scss'
})
export class RequestsApprovalsComponent implements OnInit {
  service = inject(EmailService)
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

  public columnDefs: ColDef[] = [
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
  ngOnInit(): void {

    this.onTabChanged({ index: 1 })
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

 getData() {
    
  }
  onTabChanged(event: any) {
    switch (event.index) {
      case 0:
        this.callFirstTabAPI();
        break;

      case 1:
        this.callSecondTabAPI();
        break;

      case 2:
        this.callThirdTabAPI();
        break;
    }


  }
  callThirdTabAPI() { }
  callSecondTabAPI() { }
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
