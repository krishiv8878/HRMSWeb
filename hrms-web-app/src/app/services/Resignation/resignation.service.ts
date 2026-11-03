import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ResignationItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  reason?: string;
  status: boolean;
  managerId: number;
  managerName?: string;
  noticePeriod?: string;
  resignation_Date?: string;
  resignationStatus?: string; // 'Submitted', 'PendingManager', 'PendingHR', 'NoticePeriod', 'ExitClearance', 'Exited', 'Withdrawn', 'Rejected'
  requestedLwd?: string;
  proposedLwd?: string;
  approvedLwd?: string;
  noticeShortfallDays?: number;
  noticeHandling?: string; // 'Standard', 'Waived', 'ShortfallRecovery'
  managerRemarks?: string;
  hrRemarks?: string;
  exitInterviewRemarks?: string;
  isLwdLocked: boolean;
  assetClearanceOverrideReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResignationService {
  private http = inject(HttpClient);
  private api = environment.host;

  getAllResignations(): Observable<any> {
    return this.http.get<any>(`${this.api}/Resignation/GetResignation`);
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/AddResignation`, data);
  }

  updateResignation(data: any): Observable<any> {
    return this.http.put<any>(`${this.api}/Resignation/UpdateResignation`, data);
  }

  deleteResignation(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/Resignation/DeleteResignation?ResignationId=${id}`);
  }

  approveOrReject(data: any): Observable<any> {
    return this.http.put<any>(`${this.api}/Resignation/ApproveOrRejectResignation`, data);
  }

  withdrawResignation(id: number): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/withdraw/${id}`, {});
  }

  managerReview(id: number, data: { accept: boolean; proposedLwd?: string; remarks: string }): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/manager-review/${id}`, data);
  }

  hrApprove(id: number, data: { approvedLwd: string; noticeHandling: string; remarks?: string }): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/hr-approve/${id}`, data);
  }

  finalizeExit(id: number, data: { overrideReason?: string; remarks?: string }): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/finalize-exit/${id}`, data);
  }

  rehireEmployee(employeeId: number, data: { newJoiningDate: string; designationId?: number; managerId?: number; shiftId?: string; reusePreviousEmployeeCode?: boolean; remarks?: string }): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/rehire/${employeeId}`, data);
  }

  updateFnFStatus(id: number, data: { status: string; remarks?: string }): Observable<any> {
    return this.http.put<any>(`${this.api}/Resignation/${id}/fnf-status`, data);
  }

  getOverdueExitsCount(): Observable<any> {
    return this.http.get<any>(`${this.api}/Resignation/overdue-exits-count`);
  }

  getOverdueExits(): Observable<any> {
    return this.http.get<any>(`${this.api}/Resignation/overdue-exits`);
  }
}
