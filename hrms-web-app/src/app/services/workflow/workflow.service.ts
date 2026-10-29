import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface WorkflowInboxItem {
  workflowInstanceId: number;
  requestType: string;
  requestId: number;
  requesterId: number;
  requesterName: string;
  requesterRole?: string;
  requesterDepartment?: string;
  requesterAvatar?: string;
  title: string;
  summary: string;
  submittedDate: string;
  dueTime?: string;
  currentStepOrder: number;
  currentStepName: string;
  pendingWith: string;
  status: string;
  isEscalated: boolean;
  canApprove: boolean;
  canOverride: boolean;
  canReassign: boolean;
  canCancel: boolean;
  payloadSummary: { [key: string]: any };
}

export interface WorkflowScopedRequest {
  workflowInstanceId: number;
  requestType: string;
  requestId: number;
  requesterId: number;
  requesterName: string;
  requesterDepartment?: string;
  title: string;
  summary: string;
  submittedDate: string;
  status: string;
  currentStepOrder: number;
  currentStepName: string;
  pendingWith: string;
  canApprove: boolean;
  canOverride: boolean;
  canReassign: boolean;
  canCancel: boolean;
  payloadSummary: { [key: string]: any };
}

export interface WorkflowStepDetail {
  id: number;
  stepOrder: number;
  stepName: string;
  status: string;
  approverRuleType: string;
  resolutionReason: string;
  eligibleApproverNames: string[];
  actionByName?: string;
  actionCapacity?: string;
  actionDecision?: string;
  comment?: string;
  stepStartTime: string;
  actionTime?: string;
  dueTime?: string;
  isEscalated: boolean;
}

export interface WorkflowAuditItem {
  id: number;
  eventType: string;
  performedByName: string;
  actionCapacity?: string;
  details: string;
  oldStatus?: string;
  newStatus?: string;
  timestamp: string;
}

export interface WorkflowInstanceDetail {
  workflowInstanceId: number;
  requestType: string;
  requestId: number;
  requesterId: number;
  requesterName: string;
  status: string;
  definitionVersion: number;
  currentStepOrder: number;
  startedDate: string;
  completedDate?: string;
  pendingWith: string;
  canApprove: boolean;
  canOverride: boolean;
  canReassign: boolean;
  canCancel: boolean;
  payloadSummary: { [key: string]: any };
  steps: WorkflowStepDetail[];
  auditTrail: WorkflowAuditItem[];
}

export interface WorkflowActionResult {
  success: boolean;
  message: string;
  statusCode?: string;
  workflowStatus?: string;
  isWorkflowCompleted: boolean;
  currentStepOrder?: number;
  actionCapacity?: string;
}

export interface WorkflowDelegation {
  id: number;
  fromEmployeeId: number;
  fromEmployeeName?: string;
  toEmployeeId: number;
  toEmployeeName?: string;
  startDate: string;
  endDate: string;
  requestType?: string;
  reason?: string;
  isActive: boolean;
}

export interface CreateWorkflowDelegationPayload {
  toEmployeeId: number;
  startDate: string;
  endDate: string;
  requestType?: string;
  reason?: string;
}

// ==============================================================
// Admin Workflow Configuration DTOs (WORKFLOW_CONFIGURE)
// ==============================================================

export interface WorkflowDefinitionSummary {
  id: number;
  requestType: string;
  version: number;
  title: string;
  description?: string;
  isPublished: boolean;
  effectiveDate: string;
  stepCount: number;
  routingRuleCount: number;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

export interface WorkflowStepConfig {
  id?: number;
  stepOrder: number;
  stepName: string;
  approverRuleType: string; // 'ReportingManager' | 'SkipLevelManager' | 'DepartmentHead' | 'RoleInLocation' | 'ProjectOwner' | 'SpecificPerson' | 'GroupQueue'
  ruleParameters?: string;
  stepMode: string; // 'AnyOne' | 'All'
  conditionJson?: string;
  timeLimitHours?: number;
  isEscalationEnabled: boolean;
  escalationTarget?: string;
  escalationAction?: string; // 'Reassign' | 'Notify'
}

export interface WorkflowRoutingRuleConfig {
  id?: number;
  scopeType: string; // 'Default' | 'Department' | 'Location' | 'Project'
  scopeValue?: string;
  approverRule?: string;
  priority: number;
  isDefault: boolean;
}

export interface WorkflowDefinitionDetail {
  definition: WorkflowDefinitionSummary;
  steps: WorkflowStepConfig[];
  routingRules: WorkflowRoutingRuleConfig[];
}

export interface WorkflowDefinitionSavePayload {
  requestType: string;
  title: string;
  description?: string;
  effectiveDate?: string;
  steps: WorkflowStepConfig[];
  routingRules: WorkflowRoutingRuleConfig[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TestRoutingRequestPayload {
  requestType: string;
  employeeId: number;
  department?: string;
  location?: string;
  projectId?: number;
  sampleContext?: { [key: string]: any };
}

export interface TestRoutingStepResult {
  stepOrder: number;
  stepName: string;
  approverRuleType: string;
  conditionMet: boolean;
  conditionSummary: string;
  eligibleApproverIds: number[];
  eligibleApproverNames: string[];
  resolutionReason: string;
  mode: string;
  timeLimitHours?: number;
  escalationTarget?: string;
}

export interface TestRoutingResponse {
  success: boolean;
  message: string;
  requesterName: string;
  matchedRouteScope: string;
  steps: TestRoutingStepResult[];
}

export interface WorkflowVersionHistoryItem {
  version: number;
  title: string;
  isPublished: boolean;
  effectiveDate: string;
  createdDate: string;
  createdBy: string;
  stepCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  /**
   * Pending inbox: only items where the current user is an eligible approver on the current step.
   */
  getPendingInbox(): Observable<ApiResponse<WorkflowInboxItem[]>> {
    return this.http.get<ApiResponse<WorkflowInboxItem[]>>(`${this.apiUrl}/Workflow/inbox`);
  }

  /**
   * Scoped requests: filtered by PBAC view scope (self, team, department, or company-wide).
   */
  getRequestsInScope(requestType?: string, status?: string): Observable<ApiResponse<WorkflowScopedRequest[]>> {
    let params = new HttpParams();
    if (requestType && requestType !== 'All') {
      params = params.set('requestType', requestType);
    }
    if (status && status !== 'All') {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<WorkflowScopedRequest[]>>(`${this.apiUrl}/Workflow/in-scope`, { params });
  }

  /**
   * Workflow instance details with step history and full audit trail.
   */
  getInstanceDetails(instanceId: number): Observable<ApiResponse<WorkflowInstanceDetail>> {
    return this.http.get<ApiResponse<WorkflowInstanceDetail>>(`${this.apiUrl}/Workflow/instance/${instanceId}`);
  }

  /**
   * Take action on a pending step: Approve, Reject, OverrideApprove, OverrideReject, or Reassign.
   */
  actOnStep(
    instanceId: number,
    action: 'Approve' | 'Reject' | 'OverrideApprove' | 'OverrideReject' | 'Reassign',
    reason?: string,
    reassignToEmployeeId?: number
  ): Observable<ApiResponse<WorkflowActionResult>> {
    const payload = {
      action,
      reason: reason || '',
      reassignToEmployeeId: reassignToEmployeeId || null
    };
    return this.http.post<ApiResponse<WorkflowActionResult>>(`${this.apiUrl}/Workflow/instance/${instanceId}/action`, payload);
  }

  /**
   * Cancel an in-flight workflow instance (requester or admin override).
   */
  cancelWorkflow(instanceId: number, reason?: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/Workflow/instance/${instanceId}/cancel`, {
      reason: reason || 'Cancelled by user'
    });
  }

  /**
   * Delegations: Get current user's delegations.
   */
  getMyDelegations(): Observable<ApiResponse<WorkflowDelegation[]>> {
    return this.http.get<ApiResponse<WorkflowDelegation[]>>(`${this.apiUrl}/WorkflowDelegation/my`);
  }

  /**
   * Delegations: Create a new delegation.
   */
  createDelegation(payload: CreateWorkflowDelegationPayload): Observable<ApiResponse<WorkflowDelegation>> {
    return this.http.post<ApiResponse<WorkflowDelegation>>(`${this.apiUrl}/WorkflowDelegation`, payload);
  }

  /**
   * Delegations: Revoke an active delegation.
   */
  revokeDelegation(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/WorkflowDelegation/${id}`);
  }

  // ==============================================================
  // Admin Workflow Configuration API Methods (WORKFLOW_CONFIGURE)
  // ==============================================================

  /**
   * List all workflow definitions (grouped by request type) with version and status.
   */
  getDefinitions(): Observable<ApiResponse<WorkflowDefinitionSummary[]>> {
    return this.http.get<ApiResponse<WorkflowDefinitionSummary[]>>(`${this.apiUrl}/Workflow/definitions`);
  }

  /**
   * Get active or specific version definition with steps and routing matrix.
   */
  getDefinitionDetail(requestType: string, version?: number): Observable<ApiResponse<WorkflowDefinitionDetail>> {
    let params = new HttpParams();
    if (version !== undefined && version !== null) {
      params = params.set('version', version.toString());
    }
    return this.http.get<ApiResponse<WorkflowDefinitionDetail>>(`${this.apiUrl}/Workflow/definitions/${requestType}`, { params });
  }

  /**
   * Validate workflow configuration before publishing.
   */
  validateDefinition(payload: WorkflowDefinitionSavePayload): Observable<ApiResponse<WorkflowValidationResult>> {
    return this.http.post<ApiResponse<WorkflowValidationResult>>(`${this.apiUrl}/Workflow/definitions/validate`, payload);
  }

  /**
   * Publish a new version of workflow definition (steps & routing matrix).
   */
  saveDefinition(payload: WorkflowDefinitionSavePayload): Observable<ApiResponse<WorkflowDefinitionDetail>> {
    return this.http.post<ApiResponse<WorkflowDefinitionDetail>>(`${this.apiUrl}/Workflow/definitions`, payload);
  }

  /**
   * Test routing simulator: choose an employee and sample context to preview resolution.
   */
  testRouting(payload: TestRoutingRequestPayload): Observable<ApiResponse<TestRoutingResponse>> {
    return this.http.post<ApiResponse<TestRoutingResponse>>(`${this.apiUrl}/Workflow/test-routing`, payload);
  }

  /**
   * Get version history for a request type with change logs.
   */
  getVersionHistory(requestType: string): Observable<ApiResponse<WorkflowVersionHistoryItem[]>> {
    return this.http.get<ApiResponse<WorkflowVersionHistoryItem[]>>(`${this.apiUrl}/Workflow/definitions/${requestType}/history`);
  }

  /**
   * Rollback active workflow to a previously published version.
   */
  rollbackVersion(requestType: string, version: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/Workflow/definitions/${requestType}/rollback/${version}`, {});
  }
}
