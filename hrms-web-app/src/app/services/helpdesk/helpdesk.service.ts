import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface HelpdeskTicketActivity {
  id: number;
  ticketId: number;
  activityType: 'Created' | 'StatusChange' | 'Assigned' | 'Comment' | 'Resolution';
  oldStatus?: string;
  newStatus?: string;
  assignedToEmployeeId?: number;
  assigneeName?: string;
  performedByEmployeeId: number;
  performedByName: string;
  performedByEmail?: string;
  comment: string;
  timestamp: string;
}

export interface SupportAgent {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName: string;
  designation?: string;
  department?: string;
  emailAddress?: string;
}

export interface HelpdeskTicket {
  id: number;
  ticketNumber: string;
  requesterEmployeeId: number;
  requesterName: string;
  requesterCode?: string;
  requesterEmail?: string;
  requesterDepartment?: string;
  departmentCategory: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Pending User' | 'Resolved' | 'Closed' | 'Cancelled';
  assignedToEmployeeId?: number;
  assigneeName?: string;
  slaDueTime?: string;
  resolvedDate?: string;
  resolutionNotes?: string;
  createdDate: string;
  slaStatus: string;
  activities?: HelpdeskTicketActivity[];
  canCurrentUserUpdateStatus?: boolean;
  canCurrentUserAssign?: boolean;
  canCurrentUserClaim?: boolean;
  canCurrentUserComment?: boolean;
  canRequesterCloseOrReopen?: boolean;
  canRequesterCancel?: boolean;
}

export interface HelpdeskMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  criticalTicketsCount: number;
  slaCompliancePercent: number;
  averageResolutionHours: number;
}

@Injectable({
  providedIn: 'root'
})
export class HelpdeskService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Helpdesk`;

  getTickets(status?: string, category?: string, priority?: string, requesterId?: number, assigneeId?: number): Observable<any> {
    let params = new HttpParams();
    if (status && status !== 'All') params = params.set('status', status);
    if (category && category !== 'All') params = params.set('category', category);
    if (priority && priority !== 'All') params = params.set('priority', priority);
    if (requesterId !== undefined && requesterId !== null) params = params.set('requesterId', requesterId.toString());
    if (assigneeId !== undefined && assigneeId !== null) params = params.set('assigneeId', assigneeId.toString());
    return this.http.get<any>(`${this.apiUrl}/tickets`, { params });
  }

  getTicketById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/${id}`);
  }

  createTicket(payload: { subject: string; description: string; departmentCategory: string; priority: string; assignedToEmployeeId?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets`, payload);
  }

  updateTicketStatus(payload: { ticketId: number; status: string; resolutionNotes?: string; assignedToEmployeeId?: number }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tickets/status`, payload);
  }

  assignTicket(payload: { ticketId: number; assignToEmployeeId: number; assignmentNotes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets/assign`, payload);
  }

  claimTicket(ticketId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets/${ticketId}/claim`, {});
  }

  addComment(ticketId: number, comment: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets/${ticketId}/comments`, { ticketId, comment });
  }

  getActivities(ticketId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/${ticketId}/activities`);
  }

  getSupportAgents(category?: string): Observable<any> {
    let params = new HttpParams();
    if (category && category !== 'All') params = params.set('category', category);
    return this.http.get<any>(`${this.apiUrl}/support-agents`, { params });
  }

  getMetrics(departmentCategory?: string): Observable<any> {
    let params = new HttpParams();
    if (departmentCategory && departmentCategory !== 'All') params = params.set('departmentCategory', departmentCategory);
    return this.http.get<any>(`${this.apiUrl}/metrics`, { params });
  }
}
