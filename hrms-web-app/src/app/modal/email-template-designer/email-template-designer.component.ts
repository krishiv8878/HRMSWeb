import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { EmailTemplate, EmailTemplateService, EmailTemplateType } from '../../services/email-template/email-template.service';

export interface EmailTemplateDesignerData {
  isEdit: boolean;
  template?: EmailTemplate;
  preselectedTypeId?: number;
  initialMode?: 'designer' | 'source' | 'preview';
}

export interface VariablePlaceholder {
  tag: string;
  label: string;
  sampleValue: string;
  icon: string;
}

export interface StarterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  html: string;
}

@Component({
  selector: 'app-email-template-designer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './email-template-designer.component.html',
  styleUrl: './email-template-designer.component.scss'
})
export class EmailTemplateDesignerComponent implements OnInit, AfterViewInit {
  private dialogRef = inject(MatDialogRef<EmailTemplateDesignerComponent>);
  public data: EmailTemplateDesignerData = inject(MAT_DIALOG_DATA) || { isEdit: false };
  private templateService = inject(EmailTemplateService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('visualCanvas') visualCanvasRef!: ElementRef<HTMLDivElement>;

  templateTypes: EmailTemplateType[] = [];
  selectedTypeId: number | null = null;
  existingTemplateId: number | null = null;
  templateHtml: string = '';

  viewMode: 'designer' | 'source' | 'preview' = 'designer';
  previewDevice: 'desktop' | 'mobile' = 'desktop';
  isSubmitting: boolean = false;

  // Dynamic Variable Palette
  variables: VariablePlaceholder[] = [
    { tag: '{{EmployeeName}}', label: 'Employee Name', sampleValue: 'Alex Morgan', icon: 'person' },
    { tag: '{{USERNAME}}', label: 'Login Username', sampleValue: 'alex.morgan@company.com', icon: 'alternate_email' },
    { tag: '{{TEMP_PASSWORD}}', label: 'Temporary Password', sampleValue: 'Pass#2026!', icon: 'password' },
    { tag: '{{ActionUrl}}', label: 'Portal / Action Link', sampleValue: 'https://khrms.internal', icon: 'link' },
    { tag: '{{URL}}', label: 'Action URL (Alias)', sampleValue: 'https://khrms.internal/login', icon: 'link' },
    { tag: '{{EmployeeId}}', label: 'Employee ID', sampleValue: 'EMP-018', icon: 'badge' },
    { tag: '{{Department}}', label: 'Department', sampleValue: 'Engineering', icon: 'domain' },
    { tag: '{{Designation}}', label: 'Designation', sampleValue: 'Senior Software Engineer', icon: 'work' },
    { tag: '{{ManagerName}}', label: 'Manager Name', sampleValue: 'Sarah Jenkins', icon: 'supervisor_account' },
    { tag: '{{LeaveType}}', label: 'Leave Type', sampleValue: 'Casual Leave', icon: 'beach_access' },
    { tag: '{{StartDate}}', label: 'Start Date', sampleValue: '25 Sep 2026', icon: 'event' },
    { tag: '{{EndDate}}', label: 'End Date', sampleValue: '27 Sep 2026', icon: 'event_available' },
    { tag: '{{Duration}}', label: 'Duration', sampleValue: '3 Days', icon: 'timer' },
    { tag: '{{Reason}}', label: 'Reason Comment', sampleValue: 'Family event', icon: 'notes' },
    { tag: '{{LeaveDescription}}', label: 'Leave Description', sampleValue: 'Attending personal function', icon: 'description' },
    { tag: '{{Date}}', label: 'Adjustment Date', sampleValue: '2026-09-20', icon: 'today' },
    { tag: '{{InTime}}', label: 'Clock In Time', sampleValue: '09:00 AM', icon: 'schedule' },
    { tag: '{{OutTime}}', label: 'Clock Out Time', sampleValue: '06:00 PM', icon: 'schedule' },
    { tag: '{{Period}}', label: 'Timesheet Period', sampleValue: '15 Sep - 21 Sep 2026', icon: 'date_range' },
    { tag: '{{TotalHours}}', label: 'Total Hours', sampleValue: '40.0 Hrs', icon: 'timer' },
    { tag: '{{AssetName}}', label: 'Asset Name', sampleValue: 'Dell Latitude 5540', icon: 'laptop_mac' },
    { tag: '{{SerialNumber}}', label: 'Serial Number', sampleValue: 'DL-98234-K', icon: 'qr_code' },
    { tag: '{{MonthYear}}', label: 'Pay Period', sampleValue: 'September 2026', icon: 'payments' },
    { tag: '{{NoticePeriod}}', label: 'Notice Period', sampleValue: '60 Days', icon: 'hourglass_bottom' },
    { tag: '{{ResignationDate}}', label: 'Last Working Date', sampleValue: '31 Oct 2026', icon: 'event_busy' },
    { tag: '{{CompanyName}}', label: 'Company Name', sampleValue: 'KHRMS Enterprise', icon: 'corporate_fare' },
    { tag: '{{CurrentYear}}', label: 'Current Year', sampleValue: '2026', icon: 'calendar_today' }
  ];

  // Professional Starter Corporate Presets
  presets: StarterPreset[] = [
    {
      id: 'leave_approved',
      name: 'Leave Approval Notice',
      description: 'Formal confirmation when manager approves time off',
      icon: 'check_circle',
      html: `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <div style="background:#2563eb;padding:24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bfdbfe;">KHRMS NOTIFICATION</div>
    <h2 style="margin:6px 0 0 0;font-size:22px;font-weight:700;">Leave Request Approved</h2>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#334155;line-height:1.6;margin-top:0;">Hello <strong>{{EmployeeName}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Your time-off application for <strong>{{LeaveType}}</strong> has been officially approved by your manager, <strong>{{ManagerName}}</strong>.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #16a34a;border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">LEAVE DETAILS</div>
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Type:</strong> {{LeaveType}}</div>
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Duration:</strong> {{StartDate}} to {{EndDate}} ({{Duration}})</div>
      <div style="font-size:14px;color:#0f172a;"><strong>Reason:</strong> {{Reason}}</div>
    </div>
    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="{{ActionUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 2px 6px rgba(37,99,235,0.3);">View in HRMS Portal</a>
    </div>
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:0;text-align:center;">This is an automated notification from {{CompanyName}} Workforce Operations.</p>
  </div>
</div>`
    },
    {
      id: 'leave_rejected',
      name: 'Leave Rejection Notice',
      description: 'Notification when leave request is declined',
      icon: 'cancel',
      html: `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <div style="background:#dc2626;padding:24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fecaca;">TIME ATTENDANCE UPDATE</div>
    <h2 style="margin:6px 0 0 0;font-size:22px;font-weight:700;">Leave Application Update</h2>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#334155;line-height:1.6;margin-top:0;">Hello <strong>{{EmployeeName}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Your manager <strong>{{ManagerName}}</strong> has reviewed your leave application for <strong>{{LeaveType}}</strong> and has marked it as declined.</p>
    <div style="background:#fef2f2;border:1px solid #fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:8px;">REQUEST SUMMARY</div>
      <div style="font-size:14px;color:#7f1d1d;margin-bottom:6px;"><strong>Period:</strong> {{StartDate}} to {{EndDate}}</div>
      <div style="font-size:14px;color:#7f1d1d;"><strong>Reason Submitted:</strong> {{Reason}}</div>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Please connect with your reporting manager if you have questions or wish to adjust your schedule.</p>
    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="{{ActionUrl}}" style="display:inline-block;background:#334155;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Go to Time Off Dashboard</a>
    </div>
  </div>
</div>`
    },
    {
      id: 'welcome_onboarding',
      name: 'Welcome & Employee Onboarding',
      description: 'First-day welcome message with credentials and portal link',
      icon: 'waving_hand',
      html: `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <div style="background:linear-gradient(135deg, #1e40af, #3b82f6);padding:32px;color:#ffffff;text-align:center;">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bfdbfe;margin-bottom:6px;">WELCOME TO THE TEAM</div>
    <h1 style="margin:0;font-size:26px;font-weight:800;">Welcome to {{CompanyName}}!</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#0f172a;line-height:1.6;margin-top:0;">Dear <strong>{{EmployeeName}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">We are delighted to welcome you as a <strong>{{Designation}}</strong> in the <strong>{{Department}}</strong> department. Your official employee code is <strong>{{EmployeeId}}</strong>.</p>
    <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:8px;padding:20px;margin:24px 0;">
      <h4 style="margin:0 0 10px 0;color:#1e40af;font-size:14px;font-weight:700;">First Steps on Day 1:</h4>
      <ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:13px;line-height:1.8;">
        <li>Log in to your KHRMS account to complete your profile.</li>
        <li>Review your direct deposit banking information.</li>
        <li>Familiarize yourself with company holidays and attendance guidelines.</li>
      </ul>
    </div>
    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="{{ActionUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;box-shadow:0 3px 8px rgba(37,99,235,0.3);">Access Your Employee Portal</a>
    </div>
  </div>
</div>`
    },
    {
      id: 'payslip_ready',
      name: 'Monthly Payslip Notification',
      description: 'Alert informing employee that salary statement is generated',
      icon: 'receipt_long',
      html: `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <div style="background:#0f172a;padding:24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">PAYROLL & COMPENSATION</div>
    <h2 style="margin:6px 0 0 0;font-size:22px;font-weight:700;">Your Monthly Payslip is Available</h2>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#334155;line-height:1.6;margin-top:0;">Hello <strong>{{EmployeeName}}</strong> ({{EmployeeId}}),</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Your salary slip for the current cycle has been finalized and uploaded to your secure document repository.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Recipient:</strong> {{EmployeeName}}</div>
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Designation:</strong> {{Designation}}</div>
      <div style="font-size:14px;color:#0f172a;"><strong>Status:</strong> Disbursed & Verified</div>
    </div>
    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="{{ActionUrl}}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Download / View Payslip</a>
    </div>
  </div>
</div>`
    },
    {
      id: 'asset_assigned',
      name: 'Hardware Asset Handover',
      description: 'Corporate hardware laptop/device assignment confirmation',
      icon: 'laptop_mac',
      html: `<div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
  <div style="background:#475569;padding:24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#cbd5e1;">IT INFRASTRUCTURE & HARDWARE</div>
    <h2 style="margin:6px 0 0 0;font-size:22px;font-weight:700;">Corporate Asset Assigned</h2>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#334155;line-height:1.6;margin-top:0;">Hello <strong>{{EmployeeName}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">A corporate device has been allocated to your profile in the {{CompanyName}} hardware inventory.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Assigned To:</strong> {{EmployeeName}} ({{EmployeeId}})</div>
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>Department:</strong> {{Department}}</div>
      <div style="font-size:14px;color:#0f172a;"><strong>Policy Notice:</strong> Hardware must adhere to acceptable use guidelines.</div>
    </div>
    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="{{ActionUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Confirm Receipt & Acknowledge</a>
    </div>
  </div>
</div>`
    }
  ];

  ngOnInit(): void {
    if (this.data.initialMode) {
      this.viewMode = this.data.initialMode;
    }

    this.loadTemplateTypes();

    if (this.data.isEdit && this.data.template) {
      this.selectedTypeId = this.data.template.emailTemplateTypeId;
      this.existingTemplateId = this.data.template.id;
      this.templateHtml = this.data.template.templateHtml || '';
    } else if (this.data.preselectedTypeId) {
      this.selectedTypeId = this.data.preselectedTypeId;
      this.checkExistingForType(this.selectedTypeId);
    } else {
      this.loadPreset('leave_approved', false);
    }
  }

  ngAfterViewInit(): void {
    this.syncCanvas();
  }

  syncCanvas(): void {
    setTimeout(() => {
      if (this.visualCanvasRef?.nativeElement) {
        this.visualCanvasRef.nativeElement.innerHTML = this.templateHtml || '';
      }
    }, 50);
  }

  loadTemplateTypes(): void {
    this.templateService.getAllTypes().subscribe({
      next: (types) => {
        this.templateTypes = types;
        if (!this.selectedTypeId && types.length > 0) {
          this.selectedTypeId = types[0].id;
          if (!this.data.isEdit) {
            this.checkExistingForType(this.selectedTypeId);
          }
        }
      }
    });
  }

  onTypeChange(typeId: any): void {
    if (!typeId) return;
    this.selectedTypeId = Number(typeId);
    this.checkExistingForType(this.selectedTypeId);
  }

  checkExistingForType(typeId: number): void {
    this.templateService.getByTemplateTypeId(typeId).subscribe({
      next: (existing) => {
        if (existing && existing.templateHtml && existing.templateHtml.trim().length > 0) {
          this.existingTemplateId = existing.id;
          this.templateHtml = existing.templateHtml;
          this.syncCanvas();
          this.toastr.info(`Loaded existing template design for "${this.selectedTypeObj?.templateType}".`, 'Existing Template Found');
        } else {
          this.existingTemplateId = null;
        }
      }
    });
  }

  get selectedTypeObj(): EmailTemplateType | undefined {
    return this.templateTypes.find(t => t.id === Number(this.selectedTypeId));
  }

  loadPreset(presetId: string, notify: boolean = true): void {
    const preset = this.presets.find(p => p.id === presetId);
    if (preset) {
      this.templateHtml = preset.html;
      this.syncCanvas();
      if (notify) {
        this.toastr.info(`Loaded "${preset.name}" starter preset.`, 'Preset Applied');
      }
    }
  }

  // View Mode Navigation
  setViewMode(mode: 'designer' | 'source' | 'preview'): void {
    if (this.viewMode === 'designer' && this.visualCanvasRef?.nativeElement) {
      this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
    }
    this.viewMode = mode;
    if (mode === 'designer') {
      this.syncCanvas();
    }
  }

  // Formatting Toolbar commands
  execCmd(command: string, value: string = ''): void {
    if (this.viewMode !== 'designer') {
      this.setViewMode('designer');
    }
    document.execCommand(command, false, value);
    if (this.visualCanvasRef?.nativeElement) {
      this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
    }
  }

  insertVariable(tag: string): void {
    if (this.viewMode === 'source') {
      this.templateHtml += tag;
      return;
    }

    this.setViewMode('designer');
    setTimeout(() => {
      if (this.visualCanvasRef?.nativeElement) {
        this.visualCanvasRef.nativeElement.focus();
        document.execCommand('insertText', false, tag);
        this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
      }
    }, 0);
  }

  insertButtonSnippet(): void {
    const btnHtml = `<div style="text-align:center;margin:24px 0;"><a href="{{ActionUrl}}" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-family:sans-serif;font-size:14px;">Click Here</a></div>`;
    this.insertHtmlSnippet(btnHtml);
  }

  insertAlertSnippet(): void {
    const alertHtml = `<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:8px;padding:16px;margin:16px 0;color:#166534;font-size:14px;"><strong>Important:</strong> Your action is confirmed.</div>`;
    this.insertHtmlSnippet(alertHtml);
  }

  insertDivider(): void {
    const hrHtml = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />`;
    this.insertHtmlSnippet(hrHtml);
  }

  private insertHtmlSnippet(html: string): void {
    if (this.viewMode === 'source') {
      this.templateHtml += '\n' + html;
      return;
    }
    this.setViewMode('designer');
    setTimeout(() => {
      if (this.visualCanvasRef?.nativeElement) {
        this.visualCanvasRef.nativeElement.focus();
        document.execCommand('insertHTML', false, html);
        this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
      }
    }, 0);
  }

  onCanvasInput(): void {
    if (this.visualCanvasRef?.nativeElement) {
      this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
    }
  }

  // Live Email Preview Hydration
  getHydratedHtml(): SafeHtml {
    let result = this.templateHtml;
    for (const v of this.variables) {
      const reg = new RegExp(v.tag.replace(/([{}])/g, '\\$1'), 'g');
      result = result.replace(reg, v.sampleValue);
    }
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  onSave(): void {
    if (this.viewMode === 'designer' && this.visualCanvasRef?.nativeElement) {
      this.templateHtml = this.visualCanvasRef.nativeElement.innerHTML;
    }

    if (!this.selectedTypeId) {
      this.toastr.warning('Please select a Template Category / Type.', 'Validation');
      return;
    }

    if (!this.templateHtml || !this.templateHtml.trim()) {
      this.toastr.warning('Template HTML content cannot be empty.', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const targetId = (this.data.isEdit && this.data.template?.id) || this.existingTemplateId;

    if (targetId) {
      const payload = {
        id: targetId,
        emailTemplateTypeId: Number(this.selectedTypeId),
        templateHtml: this.templateHtml
      };

      this.templateService.updateTemplate(payload).subscribe({
        next: () => {
          this.toastr.success('Email Template saved successfully!', 'Saved');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || 'Failed to update email template';
          this.toastr.error(msg, 'Error');
        }
      });
    } else {
      const payload = {
        emailTemplateTypeId: Number(this.selectedTypeId),
        templateHtml: this.templateHtml
      };

      this.templateService.addTemplate(payload).subscribe({
        next: () => {
          this.toastr.success('New Email Template created successfully!', 'Created');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || 'Failed to create email template';
          this.toastr.error(msg, 'Error');
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
