import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { EmailTemplate, EmailTemplateService, EmailTemplateType, EmailTriggerEvent, VariableMeta } from '../../services/email-template/email-template.service';
import { EmailTemplateDesignerComponent } from '../../modal/email-template-designer/email-template-designer.component';
import { EmailTemplateTypeModalComponent } from '../../modal/email-template-type-modal/email-template-type-modal.component';

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './email-templates.component.html',
  styleUrl: './email-templates.component.scss'
})
export class EmailTemplatesComponent implements OnInit {
  private templateService = inject(EmailTemplateService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  templates: EmailTemplate[] = [];
  templateTypes: EmailTemplateType[] = [];
  triggerEvents: EmailTriggerEvent[] = [];

  activeTab: 'templates' | 'types' | 'triggers' = 'triggers';
  searchQuery: string = '';
  selectedTypeFilter: string = 'All';
  selectedTriggerCategoryFilter: string = 'All';
  isLoading: boolean = false;

  readonly defaultTriggerEvents: EmailTriggerEvent[] = [
    {
      id: 1,
      eventCode: 'ONBOARDING_CREDENTIALS',
      eventName: 'Employee Onboarding & Account Credentials',
      category: 'Authentication & Onboarding',
      description: 'Sent when candidate is hired or employee account created with credentials.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Full Name', sample: 'Alex Morgan' },
        { key: 'USERNAME', description: 'Login Username / Email', sample: 'alex.morgan@company.com' },
        { key: 'TEMP_PASSWORD', description: 'Initial Temporary Password', sample: 'Pass#2026!' },
        { key: 'URL', description: 'Portal Login Link', sample: 'https://khrms.internal/login' },
        { key: 'COMPANY_NAME', description: 'Company Name', sample: 'KHRMS Enterprise' },
        { key: 'SUPPORT_EMAIL', description: 'Support Contact Email', sample: 'support@company.com' }
      ],
      defaultSubject: 'Welcome to KHRMS – Your Account Access Details',
      isEnabled: true
    },
    {
      id: 2,
      eventCode: 'FORGOT_PASSWORD',
      eventName: 'Password Reset Request',
      category: 'Authentication & Onboarding',
      description: 'Sent when a user requests password reset link.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'URL', description: 'Password Reset Link', sample: 'https://khrms.internal/reset-password' },
        { key: 'EmployeeName', description: 'Employee Full Name', sample: 'Alex Morgan' }
      ],
      defaultSubject: 'Reset Password Request for KHRMS Account',
      isEnabled: true
    },
    {
      id: 3,
      eventCode: 'LEAVE_REQUEST_SUBMITTED',
      eventName: 'Leave Application Submitted (To Manager)',
      category: 'Leave & Attendance',
      description: 'Notification dispatched to reporting manager when employee applies for time off.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'ManagerName', description: 'Manager Full Name', sample: 'Sarah Jenkins' },
        { key: 'EmployeeName', description: 'Employee Full Name', sample: 'Alex Morgan' },
        { key: 'LeaveType', description: 'Leave Category', sample: 'Casual Leave' },
        { key: 'StartDate', description: 'Start Date', sample: '25 Sep 2026' },
        { key: 'EndDate', description: 'End Date', sample: '27 Sep 2026' },
        { key: 'LeaveDescription', description: 'Submitted Reason', sample: 'Attending family event' }
      ],
      defaultSubject: 'New Leave Request from {{EmployeeName}}',
      isEnabled: true
    },
    {
      id: 4,
      eventCode: 'LEAVE_APPROVED',
      eventName: 'Leave Request Approved (To Employee)',
      category: 'Leave & Attendance',
      description: 'Sent to employee when time off request is approved.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Full Name', sample: 'Alex Morgan' },
        { key: 'ManagerName', description: 'Approving Manager', sample: 'Sarah Jenkins' },
        { key: 'LeaveType', description: 'Leave Category', sample: 'Casual Leave' },
        { key: 'StartDate', description: 'Start Date', sample: '25 Sep 2026' },
        { key: 'EndDate', description: 'End Date', sample: '27 Sep 2026' },
        { key: 'Duration', description: 'Total Duration', sample: '3 Days' },
        { key: 'Reason', description: 'Approval Comment', sample: 'Approved by manager' }
      ],
      defaultSubject: 'Your Leave Request Has Been Approved',
      isEnabled: true
    },
    {
      id: 5,
      eventCode: 'LEAVE_REJECTED',
      eventName: 'Leave Request Declined (To Employee)',
      category: 'Leave & Attendance',
      description: 'Sent to employee when time off request is declined.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Full Name', sample: 'Alex Morgan' },
        { key: 'ManagerName', description: 'Manager Name', sample: 'Sarah Jenkins' },
        { key: 'LeaveType', description: 'Leave Category', sample: 'Casual Leave' },
        { key: 'StartDate', description: 'Start Date', sample: '25 Sep 2026' },
        { key: 'EndDate', description: 'End Date', sample: '27 Sep 2026' },
        { key: 'Reason', description: 'Decline Reason', sample: 'Schedule conflict' }
      ],
      defaultSubject: 'Your Leave Request Has Been Declined',
      isEnabled: true
    },
    {
      id: 6,
      eventCode: 'REGULARIZATION_APPROVED',
      eventName: 'Attendance Adjustment Approved',
      category: 'Leave & Attendance',
      description: 'Sent when clock-in adjustment is approved.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'ManagerName', description: 'Manager Name', sample: 'Sarah Jenkins' },
        { key: 'Date', description: 'Adjustment Date', sample: '2026-09-20' },
        { key: 'InTime', description: 'Adjusted In Time', sample: '09:00 AM' },
        { key: 'OutTime', description: 'Adjusted Out Time', sample: '06:00 PM' }
      ],
      defaultSubject: 'Your Attendance Adjustment Request Has Been Approved',
      isEnabled: true
    },
    {
      id: 7,
      eventCode: 'TIMESHEET_SUBMITTED',
      eventName: 'Weekly Timesheet Submitted (To Manager)',
      category: 'Timesheets',
      description: 'Dispatched to manager when employee logs weekly timesheet.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'ManagerName', description: 'Manager Name', sample: 'Sarah Jenkins' },
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'Period', description: 'Work Week Period', sample: '15 Sep - 21 Sep 2026' },
        { key: 'TotalHours', description: 'Total Hours', sample: '40.0 Hrs' }
      ],
      defaultSubject: 'Weekly Timesheet Submitted by {{EmployeeName}}',
      isEnabled: true
    },
    {
      id: 8,
      eventCode: 'TIMESHEET_APPROVED',
      eventName: 'Weekly Timesheet Approved',
      category: 'Timesheets',
      description: 'Sent to employee when weekly timesheet is approved.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'ManagerName', description: 'Manager Name', sample: 'Sarah Jenkins' },
        { key: 'Period', description: 'Timesheet Period', sample: '15 Sep - 21 Sep 2026' },
        { key: 'TotalHours', description: 'Total Approved Hours', sample: '40.0 Hrs' }
      ],
      defaultSubject: 'Your Timesheet Has Been Approved',
      isEnabled: true
    },
    {
      id: 9,
      eventCode: 'ASSET_ALLOCATED',
      eventName: 'Hardware Asset Allocated / Handover',
      category: 'Hardware Assets',
      description: 'Sent to employee upon company device assignment.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'EmployeeId', description: 'Employee ID', sample: 'EMP-018' },
        { key: 'AssetName', description: 'Asset Model', sample: 'Dell Latitude 5540' },
        { key: 'SerialNumber', description: 'Serial Number', sample: 'DL-98234-K' }
      ],
      defaultSubject: 'Corporate Hardware Asset Allocated',
      isEnabled: true
    },
    {
      id: 10,
      eventCode: 'PAYSLIP_PUBLISHED',
      eventName: 'Monthly Payslip Available',
      category: 'Payroll & Banking',
      description: 'Sent when salary statement is published for the pay period.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'MonthYear', description: 'Pay Period', sample: 'September 2026' },
        { key: 'Designation', description: 'Designation', sample: 'Senior Software Engineer' }
      ],
      defaultSubject: 'Your Monthly Salary Statement is Available',
      isEnabled: true
    },
    {
      id: 11,
      eventCode: 'RESIGNATION_SUBMITTED',
      eventName: 'Resignation Notice Submitted',
      category: 'Resignation & Exit',
      description: 'Sent to reporting manager when employee submits resignation.',
      availableVariablesJson: '',
      parsedVariables: [
        { key: 'ManagerName', description: 'Manager Name', sample: 'Sarah Jenkins' },
        { key: 'EmployeeName', description: 'Employee Name', sample: 'Alex Morgan' },
        { key: 'ResignationDate', description: 'Last Working Date', sample: '31 Oct 2026' },
        { key: 'NoticePeriod', description: 'Notice Period', sample: '60 Days' },
        { key: 'Reason', description: 'Submitted Reason', sample: 'Personal reasons' }
      ],
      defaultSubject: 'Resignation Notice Submitted by {{EmployeeName}}',
      isEnabled: true
    }
  ];

  selectedTestTrigger: EmailTriggerEvent | null = null;
  testRecipientEmail: string = '';
  isSendingTest: boolean = false;
  testModalOpen: boolean = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.templateService.getAllTypes().subscribe({
      next: (types) => {
        this.templateTypes = types;
        this.templateService.getAllTemplates().subscribe({
          next: (templates) => {
            this.templates = templates;
            this.loadTriggerEvents();
          },
          error: () => {
            this.loadTriggerEvents();
          }
        });
      },
      error: () => {
        this.loadTriggerEvents();
      }
    });
  }

  private loadTriggerEvents(): void {
    this.templateService.getAllTriggerEvents().subscribe({
      next: (events) => {
        if (events && events.length > 0) {
          this.triggerEvents = events;
        } else {
          this.triggerEvents = [...this.defaultTriggerEvents];
        }
        this.isLoading = false;
      },
      error: () => {
        this.triggerEvents = [...this.defaultTriggerEvents];
        this.isLoading = false;
      }
    });
  }

  get triggerCategories(): string[] {
    const cats = Array.from(new Set(this.triggerEvents.map(e => e.category).filter(Boolean)));
    return ['All', ...cats];
  }

  get filteredTriggers(): EmailTriggerEvent[] {
    let list = [...this.triggerEvents];

    if (this.selectedTriggerCategoryFilter !== 'All') {
      list = list.filter(e => e.category === this.selectedTriggerCategoryFilter);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        (e.eventName && e.eventName.toLowerCase().includes(q)) ||
        (e.eventCode && e.eventCode.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
      );
    }

    return list;
  }

  get activeTriggersCount(): number {
    return this.triggerEvents.filter(t => t.isEnabled && t.activeTemplateId).length;
  }

  getAssignedTemplateName(templateId?: number | null): string {
    if (!templateId) return 'Not Bound (Inactive)';
    const t = this.templates.find(item => item.id === templateId);
    if (!t) return `Template #${templateId}`;
    return `${this.getTypeName(t.emailTemplateTypeId)} (ID #${t.id})`;
  }

  onBindingChange(trigger: EmailTriggerEvent, newTemplateIdVal: any): void {
    const templateId = newTemplateIdVal === null || newTemplateIdVal === 'null' || newTemplateIdVal === undefined || newTemplateIdVal === ''
      ? null
      : Number(newTemplateIdVal);
    trigger.activeTemplateId = templateId;
    this.saveTriggerBinding(trigger);
  }

  onTriggerToggle(trigger: EmailTriggerEvent): void {
    this.saveTriggerBinding(trigger);
  }

  saveTriggerBinding(trigger: EmailTriggerEvent): void {
    this.templateService.updateTriggerBinding({
      id: trigger.id,
      activeTemplateId: trigger.activeTemplateId ?? null,
      isEnabled: trigger.isEnabled,
      defaultSubject: trigger.defaultSubject
    }).subscribe({
      next: (res) => {
        if (res?.success === false) {
          this.toastr.warning(res.message || 'Updated locally (database migration pending)', 'Notice');
        } else {
          this.toastr.success(`Trigger binding updated for "${trigger.eventName}"`, 'Saved');
        }
      },
      error: () => {
        this.toastr.info(`Updated in-memory binding for "${trigger.eventName}"`, 'Saved');
      }
    });
  }

  copyVariableTag(tag: string, event?: Event): void {
    if (event) event.stopPropagation();
    const token = `{{${tag}}}`;
    navigator.clipboard.writeText(token).then(() => {
      this.toastr.success(`Copied ${token} to clipboard!`, 'Token Copied');
    }).catch(() => {
      this.toastr.info(`Token: ${token}`, 'Token');
    });
  }

  openTestModal(trigger: EmailTriggerEvent, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTestTrigger = trigger;
    this.testRecipientEmail = '';
    this.testModalOpen = true;
  }

  closeTestModal(): void {
    this.testModalOpen = false;
    this.selectedTestTrigger = null;
    this.testRecipientEmail = '';
  }

  executeSendTest(): void {
    if (!this.selectedTestTrigger) return;
    if (!this.testRecipientEmail || !this.testRecipientEmail.includes('@')) {
      this.toastr.warning('Please enter a valid recipient email address', 'Validation');
      return;
    }

    this.isSendingTest = true;
    this.templateService.sendTestEmail(this.selectedTestTrigger.eventCode, this.testRecipientEmail.trim()).subscribe({
      next: (res) => {
        this.isSendingTest = false;
        if (res?.success === false) {
          this.toastr.warning(res.message || 'Failed to dispatch test email', 'Warning');
        } else {
          this.toastr.success(`Test email for "${this.selectedTestTrigger?.eventName}" delivered to ${this.testRecipientEmail}!`, 'Dispatched');
          this.closeTestModal();
        }
      },
      error: (err) => {
        this.isSendingTest = false;
        const msg = err?.error?.message || 'Failed to dispatch test email. Verify SMTP credentials in backend.';
        this.toastr.error(msg, 'SMTP Error');
      }
    });
  }

  seedDefaultTriggers(): void {
    this.isLoading = true;
    this.templateService.seedDefaultEvents().subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'System trigger events synchronized successfully!', 'Synchronized');
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
        this.toastr.info('System trigger defaults initialized in-memory.', 'Info');
      }
    });
  }

  get filteredTemplates(): EmailTemplate[] {
    let list = [...this.templates];

    if (this.selectedTypeFilter !== 'All') {
      const typeId = Number(this.selectedTypeFilter);
      list = list.filter(t => t.emailTemplateTypeId === typeId);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t => {
        const typeName = this.getTypeName(t.emailTemplateTypeId).toLowerCase();
        const html = (t.templateHtml || '').toLowerCase();
        return typeName.includes(q) || html.includes(q);
      });
    }

    return list;
  }

  get filteredTypes(): EmailTemplateType[] {
    let list = [...this.templateTypes];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.templateType && t.templateType.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return list;
  }

  getTypeName(typeId: number): string {
    const found = this.templateTypes.find(t => t.id === typeId);
    return found ? found.templateType : `Category #${typeId}`;
  }

  getTypeDescription(typeId: number): string {
    const found = this.templateTypes.find(t => t.id === typeId);
    return found ? found.description : '';
  }

  getTemplateCountForType(typeId: number): number {
    return this.templates.filter(t => t.emailTemplateTypeId === typeId).length;
  }

  get coveragePercent(): number {
    if (this.templateTypes.length === 0) return 0;
    const configuredTypes = new Set(this.templates.map(t => t.emailTemplateTypeId));
    return Math.round((configuredTypes.size / this.templateTypes.length) * 100);
  }

  getCleanPreviewSnippet(html: string): string {
    if (!html) return 'No content';
    const tmp = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
    return tmp.length > 140 ? tmp.substring(0, 140) + '...' : tmp;
  }

  cardViewMode: { [id: number]: 'design' | 'code' } = {};

  getCardViewMode(id: number): 'design' | 'code' {
    return this.cardViewMode[id] || 'design';
  }

  setCardViewMode(id: number, mode: 'design' | 'code', event?: Event): void {
    if (event) event.stopPropagation();
    this.cardViewMode[id] = mode;
  }

  getPreviewSrcdoc(html: string): string {
    if (!html || !html.trim()) {
      return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:160px;margin:0;font-size:12px;">No template content</body></html>`;
    }
    let hydrated = html;
    const sampleData: Record<string, string> = {
      '{{EmployeeName}}': 'Alex Morgan',
      '{{EmployeeId}}': 'EMP-018',
      '{{Department}}': 'Engineering',
      '{{Designation}}': 'Senior Software Engineer',
      '{{LeaveType}}': 'Casual Leave',
      '{{StartDate}}': '25 Sep 2026',
      '{{EndDate}}': '27 Sep 2026',
      '{{Duration}}': '3 Days',
      '{{Reason}}': 'Family trip',
      '{{ManagerName}}': 'Sarah Jenkins',
      '{{ActionUrl}}': '#',
      '{{CompanyName}}': 'KHRMS Enterprise',
      '{{CurrentYear}}': '2026'
    };
    for (const [tag, val] of Object.entries(sampleData)) {
      const reg = new RegExp(tag.replace(/([{}])/g, '\\$1'), 'g');
      hydrated = hydrated.replace(reg, val);
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:12px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;line-height:1.4;box-sizing:border-box;}a{pointer-events:none;cursor:default;}</style></head><body>${hydrated}</body></html>`;
  }

  copyCode(code: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.toastr.success('HTML template code copied to clipboard!', 'Copied');
    }).catch(() => {
      this.toastr.info('Failed to copy to clipboard', 'Notice');
    });
  }

  openQuickPreview(template: EmailTemplate, event?: Event): void {
    if (event) event.stopPropagation();
    this.dialog.open(EmailTemplateDesignerComponent, {
      width: '1100px',
      maxWidth: '96vw',
      data: {
        isEdit: true,
        template: template,
        initialMode: 'preview'
      }
    });
  }

  openCodeEditor(template: EmailTemplate, event?: Event): void {
    if (event) event.stopPropagation();
    const dialogRef = this.dialog.open(EmailTemplateDesignerComponent, {
      width: '1100px',
      maxWidth: '96vw',
      data: {
        isEdit: true,
        template: template,
        initialMode: 'source'
      }
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadData();
    });
  }

  // ================= ACTIONS: TEMPLATES =================

  openCreateTemplate(typeId?: number): void {
    if (this.templateTypes.length === 0) {
      this.toastr.warning('Please create at least one Template Category / Type first.', 'Notice');
      this.openCreateType();
      return;
    }

    const dialogRef = this.dialog.open(EmailTemplateDesignerComponent, {
      width: '1100px',
      maxWidth: '96vw',
      data: {
        isEdit: false,
        preselectedTypeId: typeId
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  openEditTemplate(template: EmailTemplate): void {
    const dialogRef = this.dialog.open(EmailTemplateDesignerComponent, {
      width: '1100px',
      maxWidth: '96vw',
      data: {
        isEdit: true,
        template: template
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  deleteTemplate(template: EmailTemplate): void {
    const typeName = this.getTypeName(template.emailTemplateTypeId);
    if (confirm(`Are you sure you want to delete the email template for "${typeName}"?`)) {
      this.templateService.deleteTemplate(template.id).subscribe({
        next: () => {
          this.toastr.success('Email template removed successfully!', 'Deleted');
          this.loadData();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Failed to delete email template';
          this.toastr.error(msg, 'Error');
        }
      });
    }
  }

  // ================= ACTIONS: TEMPLATE TYPES =================

  openCreateType(): void {
    const dialogRef = this.dialog.open(EmailTemplateTypeModalComponent, {
      width: '520px',
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  openEditType(type: EmailTemplateType): void {
    const dialogRef = this.dialog.open(EmailTemplateTypeModalComponent, {
      width: '520px',
      data: { isEdit: true, item: type }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  deleteType(type: EmailTemplateType): void {
    const hasTemplates = this.getTemplateCountForType(type.id) > 0;
    if (hasTemplates) {
      this.toastr.warning(
        `Cannot delete "${type.templateType}" because active email templates are linked to it. Delete the linked templates first.`,
        'Dependent Templates'
      );
      return;
    }

    if (confirm(`Are you sure you want to delete the template category "${type.templateType}"?`)) {
      this.templateService.deleteType(type.id).subscribe({
        next: () => {
          this.toastr.success('Template category removed successfully!', 'Deleted');
          this.loadData();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Failed to delete template category';
          this.toastr.error(msg, 'Error');
        }
      });
    }
  }
}
