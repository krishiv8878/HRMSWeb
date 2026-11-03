import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ChecklistTemplateTask {
  id?: number;
  templateId?: number;
  taskName: string;
  description?: string;
  category: string; // 'Employee', 'HR', 'IT', 'Admin', 'Finance', 'Manager'
  defaultAssigneeRole?: string;
  dueDays: number;
  isMandatory: boolean;
  displayOrder: number;
}

export interface ChecklistTemplate {
  id?: number;
  name: string;
  checklistType: string; // 'Onboarding' or 'Offboarding'
  description?: string;
  department?: string;
  tasks: ChecklistTemplateTask[];
}

export interface ChecklistTask {
  id: number;
  employeeChecklistId: number;
  taskName: string;
  description?: string;
  category: string;
  status: string; // 'Pending', 'InProgress', 'Completed', 'Waived', 'Rejected'
  dueDate?: string;
  assignedEmployeeId?: number;
  assignedEmployeeName?: string;
  assignedRole?: string;
  isMandatory: boolean;
  clearedDate?: string;
  clearedByEmployeeId?: number;
  clearedByEmployeeName?: string;
  remarks?: string;
  waiveReason?: string;
  waivedByEmployeeId?: number;
  waivedByEmployeeName?: string;
  attachmentUrl?: string;
  displayOrder: number;
  canClear?: boolean;
  canWaive?: boolean;
}

export interface EmployeeChecklist {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  templateId?: number;
  checklistType: string;
  title: string;
  status: string; // 'InProgress', 'Completed', 'Cancelled'
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  initiatedDate: string;
  completedDate?: string;
  remarks?: string;
  tasks: ChecklistTask[];
}

export interface AssetReturnVerification {
  allCleared: boolean;
  totalAssets: number;
  returnedAssets: number;
  pendingAssets: number;
  pendingAssetDetails: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {
  private http = inject(HttpClient);
  private api = environment.host;

  getTemplates(checklistType?: string, department?: string): Observable<any> {
    let url = `${this.api}/Checklist/templates`;
    const params: string[] = [];
    if (checklistType) params.push(`checklistType=${encodeURIComponent(checklistType)}`);
    if (department) params.push(`department=${encodeURIComponent(department)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any>(url);
  }

  getTemplateById(id: number): Observable<any> {
    return this.http.get<any>(`${this.api}/Checklist/templates/${id}`);
  }

  saveTemplate(template: ChecklistTemplate): Observable<any> {
    return this.http.post<any>(`${this.api}/Checklist/templates`, template);
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/Checklist/templates/${id}`);
  }

  instantiateChecklist(employeeId: number, checklistType: string, templateId?: number): Observable<any> {
    let url = `${this.api}/Checklist/instantiate?employeeId=${employeeId}&checklistType=${encodeURIComponent(checklistType)}`;
    if (templateId) url += `&templateId=${templateId}`;
    return this.http.post<any>(url, {});
  }

  getEmployeeChecklists(employeeId?: number, checklistType?: string): Observable<any> {
    let url = `${this.api}/Checklist/employee`;
    const params: string[] = [];
    if (employeeId) params.push(`employeeId=${employeeId}`);
    if (checklistType) params.push(`checklistType=${encodeURIComponent(checklistType)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any>(url);
  }

  getChecklistById(id: number): Observable<any> {
    return this.http.get<any>(`${this.api}/Checklist/${id}`);
  }

  updateTaskStatus(taskId: number, data: { status: string; remarks?: string; waiveReason?: string; attachmentUrl?: string }): Observable<any> {
    return this.http.put<any>(`${this.api}/Checklist/task/${taskId}/status`, data);
  }

  updateTaskAssignee(taskId: number, data: { assignedEmployeeId?: number; assignedRole?: string }): Observable<any> {
    return this.http.put<any>(`${this.api}/Checklist/task/${taskId}/assignee`, data);
  }

  verifyAssetClearance(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/Checklist/asset-clearance/${employeeId}`);
  }

  getPendingTasks(): Observable<any> {
    return this.http.get<any>(`${this.api}/Checklist/pending-tasks`);
  }
}
