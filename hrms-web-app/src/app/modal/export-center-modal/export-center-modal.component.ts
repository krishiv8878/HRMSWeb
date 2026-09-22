import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../services/employee/employee.service';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { EmailService } from '../../services/leaveRequest/email.service';
import { TimesheetService } from '../../services/timesheet/timesheet.service';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { CandidateService } from '../../services/candidate/candidate.service';
import { ProjectsService } from '../../services/project/projects.service';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { EmployeeshiftService } from '../../services/shift/employeeshift.service';

export interface ExportCategory {
  id: string;
  name: string;
  domain: 'Workforce' | 'Time & Leave' | 'Assets & Projects' | 'Finance & HR';
  icon: string;
  description: string;
}

@Component({
  selector: 'app-export-center-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './export-center-modal.component.html',
  styleUrl: './export-center-modal.component.scss'
})
export class ExportCenterModalComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ExportCenterModalComponent>);
  private toastr = inject(ToastrService);
  private employeeService = inject(EmployeeService);
  private attendanceService = inject(EmployeeeService);
  private leaveService = inject(EmailService);
  private timesheetService = inject(TimesheetService);
  private assetService = inject(AssetsmasterService);
  private paymentService = inject(PaymentinfoService);
  private candidateService = inject(CandidateService);
  private projectService = inject(ProjectsService);
  private holidayService = inject(HolidayservicesService);
  private shiftService = inject(EmployeeshiftService);

  categories: ExportCategory[] = [
    {
      id: 'employees',
      name: 'Employee Directory',
      domain: 'Workforce',
      icon: 'badge',
      description: 'Profiles, designations, managers, join dates, and contact details'
    },
    {
      id: 'attendance',
      name: 'Attendance Logs',
      domain: 'Workforce',
      icon: 'fingerprint',
      description: 'Daily clock-in, clock-out, total hours, and work attendance records'
    },
    {
      id: 'shifts',
      name: 'Shift Schedules',
      domain: 'Workforce',
      icon: 'sync_alt',
      description: 'Work shifts, start & end timings, and active assignments'
    },
    {
      id: 'leaves',
      name: 'Leave Requests & History',
      domain: 'Time & Leave',
      icon: 'beach_access',
      description: 'Applied leaves, leave types, date ranges, and approval status'
    },
    {
      id: 'timesheets',
      name: 'Weekly Timesheets',
      domain: 'Time & Leave',
      icon: 'schedule',
      description: 'Employee period timesheets, billable hours, and approvals'
    },
    {
      id: 'holidays',
      name: 'Company Holidays',
      domain: 'Time & Leave',
      icon: 'event_available',
      description: 'Corporate holiday calendar, mandatory and optional days'
    },
    {
      id: 'assets',
      name: 'Hardware Assets Inventory',
      domain: 'Assets & Projects',
      icon: 'devices',
      description: 'Asset serial numbers, types, assigned owners, and service status'
    },
    {
      id: 'projects',
      name: 'Projects Portfolio',
      domain: 'Assets & Projects',
      icon: 'business_center',
      description: 'Active client projects, priorities, and development timelines'
    },
    {
      id: 'payroll',
      name: 'Payroll & Bank Matrix',
      domain: 'Finance & HR',
      icon: 'payments',
      description: 'Employee salary accounts, bank numbers, IFSC codes, and verification'
    },
    {
      id: 'candidates',
      name: 'Candidate Pipeline',
      domain: 'Finance & HR',
      icon: 'groups',
      description: 'Recruitment candidates, applied roles, stages, and ratings'
    }
  ];

  selectedCategoryId: string = 'employees';
  selectedDateRange: 'all' | 'current_month' | 'last_month' = 'all';
  selectedFormat: 'csv' = 'csv';
  isExporting: boolean = false;

  get selectedCategory(): ExportCategory | undefined {
    return this.categories.find(c => c.id === this.selectedCategoryId);
  }

  ngOnInit(): void {
    // Component initialized
  }

  selectCategory(id: string): void {
    this.selectedCategoryId = id;
  }

  executeExport(): void {
    if (typeof window === 'undefined') return;
    this.isExporting = true;

    switch (this.selectedCategoryId) {
      case 'employees':
        this.exportEmployees();
        break;
      case 'attendance':
        this.exportAttendance();
        break;
      case 'leaves':
        this.exportLeaves();
        break;
      case 'timesheets':
        this.exportTimesheets();
        break;
      case 'assets':
        this.exportAssets();
        break;
      case 'payroll':
        this.exportPayroll();
        break;
      case 'candidates':
        this.exportCandidates();
        break;
      case 'projects':
        this.exportProjects();
        break;
      case 'holidays':
        this.exportHolidays();
        break;
      case 'shifts':
        this.exportShifts();
        break;
      default:
        this.toastr.warning('Please select a dataset to export.');
        this.isExporting = false;
        break;
    }
  }

  private exportEmployees(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = [
          'Employee ID', 'First Name', 'Last Name', 'Email Address',
          'Mobile No.', 'Role / Designation', 'Department',
          'Reporting Manager', 'Date of Joining', 'Gender', 'Status'
        ];
        const rows = list.map((e: any) => [
          e.id ?? '',
          e.firstName ?? '',
          e.lastName ?? '',
          e.emailAddress ?? '',
          e.mobileNumber ?? '',
          e.roleDisplay || e.role?.roleName || e.roleName || e.designation || '',
          e.department ?? '',
          e.managerName || (e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : '') || '',
          e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString('en-GB') : '',
          e.gender ?? '',
          e.isActive ? 'Active' : 'Inactive'
        ]);
        this.downloadCsv(`Employees_Directory_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportAttendance(): void {
    this.attendanceService.getAllData().subscribe({
      next: (res: any) => {
        let list = Array.isArray(res) ? res : (res?.data || []);
        if (this.selectedDateRange === 'current_month') {
          const now = new Date();
          const currYear = now.getFullYear();
          const currMonth = now.getMonth();
          list = list.filter((r: any) => {
            const d = new Date(r.attendanceDate || r.createdDate);
            return d.getFullYear() === currYear && d.getMonth() === currMonth;
          });
        }

        const headers = ['Record ID', 'Employee ID', 'Employee Name', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Effective Hours', 'Status'];
        const rows = list.map((r: any) => [
          r.id ?? '',
          r.employeeId ?? '',
          r.employeeName || (r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '') || '',
          r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString('en-GB') : (r.dateStr || ''),
          r.clockIn ?? '',
          r.clockOut ?? '',
          r.totalHours ?? '',
          r.effectiveHours ?? '',
          r.attendance || r.status || 'Present'
        ]);
        this.downloadCsv(`Attendance_Logs_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportLeaves(): void {
    this.leaveService.GetAllEmployeesLeaveRequest().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Leave ID', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Action Date'];
        const rows = list.map((l: any) => [
          l.id || l.leaveRequestId || '',
          l.fullName || l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : '') || '',
          typeof l.leaveType === 'string' ? l.leaveType : (l.leaveType?.type || l.leaveTypeName || 'Leave'),
          l.startDate ? new Date(l.startDate).toLocaleDateString('en-GB') : '',
          l.endDate ? new Date(l.endDate).toLocaleDateString('en-GB') : '',
          l.leaveReason || l.reason || '',
          l.status || 'Pending',
          l.actionDate ? new Date(l.actionDate).toLocaleDateString('en-GB') : ''
        ]);
        this.downloadCsv(`Leave_Requests_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportTimesheets(): void {
    this.timesheetService.getPendingApprovals().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Timesheet ID', 'Employee Name', 'Period Start', 'Period End', 'Total Hours', 'Status'];
        const rows = list.map((t: any) => [
          t.id || t.timesheetId || '',
          t.employeeName || (t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '') || '',
          t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB') : '',
          t.endDate ? new Date(t.endDate).toLocaleDateString('en-GB') : '',
          t.totalHours ?? 0,
          t.status || 'Submitted'
        ]);
        this.downloadCsv(`Timesheets_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportAssets(): void {
    const list = this.assetService.currentAssets || [];
    if (list.length > 0) {
      const headers = ['Asset ID', 'Model / Name', 'Category / Type', 'Serial Number', 'Assigned To', 'Location', 'Purchase Date', 'Status', 'Specifications'];
      const rows = list.map((a: any) => [
        a.id ?? '',
        a.modelName ?? '',
        a.assetType ?? '',
        a.serialNumber ?? '',
        a.assignedTo ?? '',
        a.location ?? '',
        a.dateOfPurchase ? new Date(a.dateOfPurchase).toLocaleDateString('en-GB') : '',
        a.status ?? 'Active',
        a.specifications ?? ''
      ]);
      this.downloadCsv(`Hardware_Assets_${this.getDateStamp()}`, headers, rows);
    } else {
      this.assetService.exportToCsv();
      this.isExporting = false;
      this.toastr.success('Hardware Assets exported successfully!', 'Export Complete');
      this.dialogRef.close();
    }
  }

  private exportPayroll(): void {
    this.paymentService.getAllData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Record ID', 'Employee ID', 'Account Holder', 'Bank Name', 'Account Number', 'IFSC / Routing', 'Account Type', 'Verification Status'];
        const rows = list.map((p: any) => [
          p.id ?? '',
          p.employeeId ?? '',
          p.accountHolderName ?? '',
          p.bankName ?? '',
          p.accountNumber ? `"${p.accountNumber}"` : '',
          p.ifscCode ?? '',
          p.accountType ?? 'Checking / Savings',
          p.isVerified ? 'Verified' : 'Pending'
        ]);
        this.downloadCsv(`Payroll_Banking_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportCandidates(): void {
    this.candidateService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Candidate ID', 'Full Name', 'Email', 'Phone', 'Applied Position', 'Experience (Yrs)', 'Status', 'Rating', 'Applied Date'];
        const rows = list.map((c: any) => [
          c.id ?? '',
          `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.fullName || 'Candidate',
          c.email ?? '',
          c.phone ?? '',
          c.position || c.appliedFor || '',
          c.experienceYears ?? '',
          c.status ?? 'Applied',
          c.rating ?? '',
          c.createdDate ? new Date(c.createdDate).toLocaleDateString('en-GB') : ''
        ]);
        this.downloadCsv(`Candidates_Pipeline_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportProjects(): void {
    this.projectService.getAllData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Project ID', 'Project Name', 'Client Name', 'Priority', 'Status', 'Start Date', 'End Date'];
        const rows = list.map((p: any) => [
          p.id ?? '',
          p.projectName ?? '',
          p.clientName ?? '',
          p.priority ?? 'Normal',
          p.status ?? 'In Progress',
          p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : '',
          p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : ''
        ]);
        this.downloadCsv(`Projects_Portfolio_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportHolidays(): void {
    this.holidayService.getHoliday().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Holiday ID', 'Holiday Name', 'Date', 'Day', 'Type', 'Description'];
        const rows = list.map((h: any) => [
          h.id ?? '',
          h.holidayName ?? '',
          h.holidayDate ? new Date(h.holidayDate).toLocaleDateString('en-GB') : '',
          h.day ?? '',
          h.type || 'Mandatory',
          h.description ?? ''
        ]);
        this.downloadCsv(`Company_Holidays_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private exportShifts(): void {
    this.shiftService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const headers = ['Shift ID', 'Shift Name', 'Start Time', 'End Time', 'Status'];
        const rows = list.map((s: any) => [
          s.id ?? '',
          s.shiftName ?? '',
          s.startTime ?? '',
          s.endTime ?? '',
          s.isActive ? 'Active' : 'Inactive'
        ]);
        this.downloadCsv(`Shift_Rosters_${this.getDateStamp()}`, headers, rows);
      },
      error: () => this.handleExportError()
    });
  }

  private downloadCsv(filename: string, headers: string[], rows: any[][]): void {
    const csvRows = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ];
    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.isExporting = false;
    this.toastr.success(`${this.selectedCategory?.name} exported successfully!`, 'Export Complete');
    this.dialogRef.close();
  }

  private handleExportError(): void {
    this.isExporting = false;
    this.toastr.error('Failed to export dataset. Please verify network connection or try again.', 'Export Failed');
  }

  private getDateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  close(): void {
    this.dialogRef.close();
  }
}
