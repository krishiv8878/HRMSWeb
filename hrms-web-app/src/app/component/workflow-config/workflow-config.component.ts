import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import {
  WorkflowService,
  WorkflowDefinitionSummary,
  WorkflowDefinitionDetail,
  WorkflowStepConfig,
  WorkflowRoutingRuleConfig,
  WorkflowValidationResult,
  TestRoutingResponse,
  WorkflowVersionHistoryItem
} from '../../services/workflow/workflow.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { ProjectsService } from '../../services/project/projects.service';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';
import { RbacService } from '../../core/rbac.service';

@Component({
  selector: 'app-workflow-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './workflow-config.component.html',
  styleUrl: './workflow-config.component.scss'
})
export class WorkflowConfigComponent implements OnInit {
  private workflowService = inject(WorkflowService);
  private employeeService = inject(EmployeeService);
  private projectsService = inject(ProjectsService);
  private roleService = inject(RoleservicesService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);

  // Active Main Tab: 'definitions' | 'editor' | 'routing' | 'simulator' | 'history'
  activeTab: 'definitions' | 'editor' | 'routing' | 'simulator' | 'history' = 'definitions';

  isLoading = false;
  isSaving = false;
  isSimulating = false;

  // List of Definitions
  definitions: WorkflowDefinitionSummary[] = [];
  selectedRequestType: string = 'Leave';

  // Currently loaded definition detail
  currentDetail: WorkflowDefinitionDetail | null = null;

  // Editable models
  definitionTitle = '';
  definitionDescription = '';
  definitionEffectiveDate = '';
  steps: WorkflowStepConfig[] = [];
  routingRules: WorkflowRoutingRuleConfig[] = [];

  // Version History
  versionHistory: WorkflowVersionHistoryItem[] = [];

  // Publish Validation Feedback
  validationResult: WorkflowValidationResult | null = null;
  showValidationBanner = false;

  // Simulator Data
  simulatorEmployeeId: number = 0;
  simulatorProjectId: number = 0;
  simulatorDepartment: string = '';
  simulatorLocation: string = '';
  simulatorDays: number = 3;
  simulatorAmount: number = 1500;
  simulatorReason: string = 'Routine operational request';
  simulationResult: TestRoutingResponse | null = null;

  // Employee list for simulator & SpecificPerson rule
  employees: any[] = [];
  // Project list for ProjectOwner rule & Project routing
  projects: any[] = [];
  // Roles list for RoleInLocation & GroupQueue
  roles: any[] = [];
  // Distinct Departments & Locations
  departments: string[] = [];
  locations: string[] = [];

  // Map to toggle raw JSON view per step order
  showRawJsonMap: { [stepOrder: number]: boolean } = {};

  // Supported Rule Types
  ruleTypes = [
    { value: 'ReportingManager', label: 'Direct Reporting Manager', desc: 'Line manager from employee profile' },
    { value: 'SkipLevelManager', label: 'Skip-Level Manager', desc: 'Manager of manager in reporting tree' },
    { value: 'DepartmentHead', label: 'Department Head', desc: 'Highest authority in requester department' },
    { value: 'RoleInLocation', label: 'Role in Location / Branch', desc: 'Designated role within the same branch' },
    { value: 'ProjectOwner', label: 'Project Owner / Lead', desc: 'Lead manager assigned to request project' },
    { value: 'SpecificPerson', label: 'Specific Person (Static)', desc: 'Pre-designated employee ID' },
    { value: 'GroupQueue', label: 'Group / Queue (PBAC Role)', desc: 'Anyone holding the target role' }
  ];

  scopeTypes = [
    { value: 'Default', label: 'Default Route (Fallback for all)' },
    { value: 'Department', label: 'Department Specific' },
    { value: 'Location', label: 'Branch / Location Specific' },
    { value: 'Project', label: 'Project Specific' }
  ];

  ngOnInit(): void {
    this.loadDefinitions();
    this.loadEmployees();
    this.loadProjects();
    this.loadRoles();
  }

  loadDefinitions(): void {
    this.isLoading = true;
    this.workflowService.getDefinitions().subscribe({
      next: (res) => {
        this.definitions = res.data || [];
        this.isLoading = false;
        if (this.definitions.length > 0 && !this.selectedRequestType) {
          this.selectedRequestType = this.definitions[0].requestType;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toaster.error('Failed to load workflow definitions', 'Error');
      }
    });
  }

  loadEmployees(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        this.employees = Array.isArray(res) ? res : (res?.data || []);
        this.extractDepartmentsAndLocations();
        if (this.employees.length > 0 && !this.simulatorEmployeeId) {
          this.simulatorEmployeeId = Number(this.employees[0].id);
        }
      },
      error: () => {}
    });
  }

  loadProjects(): void {
    this.projectsService.getAllData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.projects = list.map((p: any) => ({
          id: Number(p.id ?? p.Id),
          projectName: p.projectName || p.ProjectName || `Project #${p.id ?? p.Id}`,
          projectManagerId: p.projectManagerId ?? p.ProjectManagerId ?? p.managerId ?? p.ManagerId ?? null,
          clientName: p.clientName || p.ClientName || ''
        })).filter((p: any) => p.id > 0);
      },
      error: () => {}
    });
  }

  loadRoles(): void {
    this.roleService.getAllData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.roles = list.map((r: any) => ({
          id: r.id ?? r.Id ?? r.roleMasterId ?? r.RoleMasterId,
          roleName: r.roleName || r.RoleName || r.name || `Role #${r.id}`
        })).filter((r: any) => !!r.roleName);
      },
      error: () => {}
    });
  }

  extractDepartmentsAndLocations(): void {
    const deptSet = new Set<string>([
      'Engineering', 'Human Resources', 'Finance', 'Sales', 'Marketing', 'Operations', 'Information Technology', 'Product', 'Support'
    ]);
    const locSet = new Set<string>([
      'Head Office', 'London', 'New York', 'Singapore', 'Mumbai', 'Remote'
    ]);

    this.employees.forEach(e => {
      if (e.department) deptSet.add(e.department);
      if (e.location) locSet.add(e.location);
      if (e.branch) locSet.add(e.branch);
    });

    this.departments = Array.from(deptSet).filter(Boolean).sort();
    this.locations = Array.from(locSet).filter(Boolean).sort();
  }

  // ==============================================================
  // Step Rule Parameters Parsing & Binding
  // ==============================================================

  parseRuleParams(step: WorkflowStepConfig): any {
    if (!step.ruleParameters || typeof step.ruleParameters !== 'string') return {};
    try {
      return JSON.parse(step.ruleParameters);
    } catch {
      return {};
    }
  }

  getSpecificPersonId(step: WorkflowStepConfig): number {
    const params = this.parseRuleParams(step);
    return Number(params.EmployeeId ?? params.employeeId ?? 0);
  }

  onSpecificPersonChange(step: WorkflowStepConfig, empId: any): void {
    const idNum = Number(empId);
    if (!idNum) {
      step.ruleParameters = '';
      return;
    }
    const emp = this.employees.find(e => Number(e.id) === idNum);
    const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : `Employee #${idNum}`;
    step.ruleParameters = JSON.stringify({
      EmployeeId: idNum,
      EmployeeName: name
    });
  }

  getStepProjectId(step: WorkflowStepConfig): number {
    const params = this.parseRuleParams(step);
    return Number(params.ProjectId ?? params.projectId ?? 0);
  }

  getStepProjectPersonId(step: WorkflowStepConfig): number {
    const params = this.parseRuleParams(step);
    return Number(params.EmployeeId ?? params.employeeId ?? 0);
  }

  onProjectChange(step: WorkflowStepConfig, projId: any): void {
    const pId = Number(projId);
    const params = this.parseRuleParams(step);
    if (!pId) {
      delete params.ProjectId;
      delete params.ProjectName;
      delete params.EmployeeId;
      delete params.EmployeeName;
      step.ruleParameters = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
      return;
    }

    const proj = this.projects.find(p => Number(p.id) === pId);
    params.ProjectId = pId;
    params.ProjectName = proj?.projectName || `Project #${pId}`;

    if (proj?.projectManagerId && !params.EmployeeId) {
      const pm = this.employees.find(e => Number(e.id) === Number(proj.projectManagerId));
      if (pm) {
        params.EmployeeId = Number(pm.id);
        params.EmployeeName = `${pm.firstName || ''} ${pm.lastName || ''}`.trim();
      }
    }
    step.ruleParameters = JSON.stringify(params);
  }

  onProjectPersonChange(step: WorkflowStepConfig, empId: any): void {
    const eId = Number(empId);
    const params = this.parseRuleParams(step);
    if (!eId) {
      delete params.EmployeeId;
      delete params.EmployeeName;
    } else {
      const emp = this.employees.find(e => Number(e.id) === eId);
      params.EmployeeId = eId;
      params.EmployeeName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : `Employee #${eId}`;
    }
    step.ruleParameters = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
  }

  getStepRole(step: WorkflowStepConfig): string {
    const params = this.parseRuleParams(step);
    return params.RoleName ?? params.roleName ?? params.Role ?? '';
  }

  getStepBranch(step: WorkflowStepConfig): string {
    const params = this.parseRuleParams(step);
    return params.Branch ?? params.branch ?? params.Location ?? '';
  }

  onRoleInLocationChange(step: WorkflowStepConfig, role: string, branch: string): void {
    const params = this.parseRuleParams(step);
    if (role) params.RoleName = role; else delete params.RoleName;
    if (branch) params.Branch = branch; else delete params.Branch;
    step.ruleParameters = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
  }

  onGroupQueueRoleChange(step: WorkflowStepConfig, role: string): void {
    const params = this.parseRuleParams(step);
    if (role) params.RoleName = role; else delete params.RoleName;
    step.ruleParameters = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
  }

  onRuleTypeChange(step: WorkflowStepConfig, newType: string): void {
    step.approverRuleType = newType;
    if (newType === 'ReportingManager' || newType === 'SkipLevelManager' || newType === 'DepartmentHead') {
      step.ruleParameters = '';
    }
  }

  getStepApproverName(step: WorkflowStepConfig): string {
    const params = this.parseRuleParams(step);
    if (params.EmployeeName) return params.EmployeeName;
    if (params.EmployeeId) {
      const emp = this.employees.find(e => Number(e.id) === Number(params.EmployeeId));
      if (emp) return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      return `Employee #${params.EmployeeId}`;
    }
    return '';
  }

  toggleRawJson(stepOrder: number): void {
    this.showRawJsonMap[stepOrder] = !this.showRawJsonMap[stepOrder];
  }

  onScopeTypeChange(rule: WorkflowRoutingRuleConfig): void {
    rule.scopeValue = '';
  }



  selectRequestType(reqType: string): void {
    this.selectedRequestType = reqType;
    this.validationResult = null;
    this.showValidationBanner = false;
    this.simulationResult = null;
    this.loadDefinitionDetail(reqType);
  }

  loadDefinitionDetail(reqType: string, version?: number): void {
    this.isLoading = true;
    this.workflowService.getDefinitionDetail(reqType, version).subscribe({
      next: (res) => {
        this.currentDetail = res.data;
        if (this.currentDetail) {
          this.definitionTitle = this.currentDetail.definition.title || `${reqType} Approval Workflow`;
          this.definitionDescription = this.currentDetail.definition.description || '';
          this.definitionEffectiveDate = this.currentDetail.definition.effectiveDate
            ? new Date(this.currentDetail.definition.effectiveDate).toISOString().substring(0, 10)
            : new Date().toISOString().substring(0, 10);
          this.steps = (this.currentDetail.steps || []).map(s => ({ ...s }));
          this.routingRules = (this.currentDetail.routingRules || []).map(r => ({ ...r }));
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toaster.error(`Failed to load details for ${reqType}`, 'Error');
      }
    });
  }

  switchTab(tab: 'definitions' | 'editor' | 'routing' | 'simulator' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'editor' || tab === 'routing') {
      if (!this.currentDetail || this.currentDetail.definition.requestType !== this.selectedRequestType) {
        this.loadDefinitionDetail(this.selectedRequestType);
      }
    } else if (tab === 'history') {
      this.loadVersionHistory(this.selectedRequestType);
    }
  }

  // ==============================================================
  // Steps Editor Actions
  // ==============================================================

  addStep(): void {
    const nextOrder = this.steps.length + 1;
    this.steps.push({
      stepOrder: nextOrder,
      stepName: `Step ${nextOrder} Approval`,
      approverRuleType: 'ReportingManager',
      ruleParameters: '',
      stepMode: 'AnyOne',
      conditionJson: '',
      timeLimitHours: 48,
      isEscalationEnabled: false,
      escalationTarget: 'SkipLevelManager',
      escalationAction: 'Reassign'
    });
  }

  removeStep(index: number): void {
    if (this.steps.length <= 1) {
      this.toaster.warning('A workflow must contain at least one step.', 'Action Denied');
      return;
    }
    this.steps.splice(index, 1);
    this.reorderSteps();
  }

  moveStepUp(index: number): void {
    if (index === 0) return;
    const temp = this.steps[index];
    this.steps[index] = this.steps[index - 1];
    this.steps[index - 1] = temp;
    this.reorderSteps();
  }

  moveStepDown(index: number): void {
    if (index === this.steps.length - 1) return;
    const temp = this.steps[index];
    this.steps[index] = this.steps[index + 1];
    this.steps[index + 1] = temp;
    this.reorderSteps();
  }

  private reorderSteps(): void {
    this.steps.forEach((s, idx) => {
      s.stepOrder = idx + 1;
    });
  }

  // ==============================================================
  // Routing Matrix Actions
  // ==============================================================

  addRoutingRule(): void {
    this.routingRules.push({
      scopeType: 'Department',
      scopeValue: '',
      approverRule: 'ReportingManager',
      priority: (this.routingRules.length + 1) * 10,
      isDefault: false
    });
  }

  removeRoutingRule(index: number): void {
    const rule = this.routingRules[index];
    if (rule.isDefault || rule.scopeType === 'Default') {
      this.toaster.warning('The Default fallback route cannot be deleted.', 'Action Denied');
      return;
    }
    this.routingRules.splice(index, 1);
  }

  // ==============================================================
  // Validation & Publishing
  // ==============================================================

  validateOnly(): void {
    const payload = this.buildSavePayload();
    this.workflowService.validateDefinition(payload).subscribe({
      next: (res) => {
        this.validationResult = res.data;
        this.showValidationBanner = true;
        if (this.validationResult.isValid) {
          if (this.validationResult.warnings.length > 0) {
            this.toaster.warning(`Validation passed with ${this.validationResult.warnings.length} warning(s).`, 'Validation Notice');
          } else {
            this.toaster.success('Workflow configuration validated successfully! No issues found.', 'Valid');
          }
        } else {
          this.toaster.error(`Found ${this.validationResult.errors.length} validation error(s). Please fix before publishing.`, 'Validation Errors');
        }
      },
      error: (err) => {
        this.toaster.error('Failed to execute validation check.', 'Error');
      }
    });
  }

  publishWorkflow(): void {
    const payload = this.buildSavePayload();
    this.isSaving = true;

    // Validate first
    this.workflowService.validateDefinition(payload).subscribe({
      next: (valRes) => {
        this.validationResult = valRes.data;
        if (!valRes.data.isValid) {
          this.isSaving = false;
          this.showValidationBanner = true;
          this.toaster.error('Cannot publish due to validation errors.', 'Validation Failed');
          return;
        }

        // Proceed to save and publish as a new version
        this.workflowService.saveDefinition(payload).subscribe({
          next: (res) => {
            this.isSaving = false;
            this.showValidationBanner = false;
            this.toaster.success(`Successfully published Version ${res.data.definition.version} for '${this.selectedRequestType}'!`, 'Workflow Published');
            this.loadDefinitions();
            this.loadDefinitionDetail(this.selectedRequestType);
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Failed to publish workflow';
            this.toaster.error(msg, 'Publish Error');
          }
        });
      },
      error: () => {
        this.isSaving = false;
        this.toaster.error('Validation service unavailable.', 'Error');
      }
    });
  }

  private buildSavePayload(): any {
    return {
      requestType: this.selectedRequestType,
      title: this.definitionTitle || `${this.selectedRequestType} Workflow`,
      description: this.definitionDescription,
      effectiveDate: this.definitionEffectiveDate ? new Date(this.definitionEffectiveDate).toISOString() : new Date().toISOString(),
      steps: this.steps,
      routingRules: this.routingRules
    };
  }

  // ==============================================================
  // Test Routing Simulator
  // ==============================================================

  runTestRouting(): void {
    if (!this.simulatorEmployeeId) {
      this.toaster.warning('Please select an employee to test routing for.', 'Requester Required');
      return;
    }

    this.isSimulating = true;
    this.simulationResult = null;

    const payload = {
      requestType: this.selectedRequestType,
      employeeId: Number(this.simulatorEmployeeId),
      projectId: this.simulatorProjectId > 0 ? Number(this.simulatorProjectId) : undefined,
      department: this.simulatorDepartment || undefined,
      location: this.simulatorLocation || undefined,
      sampleContext: {
        ProjectId: this.simulatorProjectId > 0 ? Number(this.simulatorProjectId) : undefined,
        Days: Number(this.simulatorDays || 1),
        Amount: Number(this.simulatorAmount || 0),
        LeaveReason: this.simulatorReason || '',
        Reason: this.simulatorReason || ''
      }
    };

    this.workflowService.testRouting(payload).subscribe({
      next: (res) => {
        this.isSimulating = false;
        this.simulationResult = res.data;
        if (res.data.success) {
          this.toaster.success(`Resolved ${res.data.steps.length} step(s) for ${res.data.requesterName}.`, 'Simulation Succeeded');
        } else {
          this.toaster.warning(res.data.message || 'Routing could not be completely resolved.', 'Resolution Blocked');
        }
      },
      error: (err: any) => {
        this.isSimulating = false;
        const msg = err?.error?.message || 'Failed to simulate routing.';
        this.toaster.error(msg, 'Simulator Error');
      }
    });
  }

  // ==============================================================
  // Version History & Rollback
  // ==============================================================

  loadVersionHistory(reqType: string): void {
    this.isLoading = true;
    this.workflowService.getVersionHistory(reqType).subscribe({
      next: (res) => {
        this.versionHistory = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toaster.error('Failed to load version history', 'Error');
      }
    });
  }

  rollbackToVersion(version: number): void {
    if (!confirm(`Are you sure you want to rollback '${this.selectedRequestType}' to Version ${version}? Future requests will route according to Version ${version}.`)) {
      return;
    }

    this.isLoading = true;
    this.workflowService.rollbackVersion(this.selectedRequestType, version).subscribe({
      next: () => {
        this.toaster.success(`Rolled back active '${this.selectedRequestType}' workflow to Version ${version}.`, 'Rollback Complete');
        this.loadDefinitions();
        this.loadDefinitionDetail(this.selectedRequestType, version);
        this.loadVersionHistory(this.selectedRequestType);
      },
      error: (err: any) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Rollback failed.';
        this.toaster.error(msg, 'Error');
      }
    });
  }
}
