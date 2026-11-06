import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  AttendanceReportItem,
  HeadcountDemographicsReport,
  LeaveBalanceReportItem,
  PayrollReconciliationReportItem,
  ReportsService
} from '../../services/reports/reports.service';
import { RbacService } from '../../core/rbac.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);

  activeTab: 'attendance' | 'leave' | 'payroll' | 'headcount' = 'attendance';
  isLoading = false;

  // Filter Parameters
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  selectedDepartment: string = 'All';

  // Data
  attendanceData: AttendanceReportItem[] = [];
  leaveBalanceData: LeaveBalanceReportItem[] = [];
  payrollData: PayrollReconciliationReportItem[] = [];
  headcountData: HeadcountDemographicsReport | null = null;

  ngOnInit(): void {
    this.loadActiveTabReport();
  }

  setTab(tab: 'attendance' | 'leave' | 'payroll' | 'headcount'): void {
    this.activeTab = tab;
    this.loadActiveTabReport();
  }

  loadActiveTabReport(): void {
    this.isLoading = true;
    switch (this.activeTab) {
      case 'attendance':
        this.reportsService.getAttendanceSummary(this.currentMonth, this.currentYear, this.selectedDepartment).subscribe({
          next: (res: any) => {
            this.attendanceData = res?.data || [];
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Failed to load attendance report');
            this.isLoading = false;
          }
        });
        break;

      case 'leave':
        this.reportsService.getLeaveBalance(this.selectedDepartment).subscribe({
          next: (res: any) => {
            this.leaveBalanceData = res?.data || [];
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Failed to load leave balance report');
            this.isLoading = false;
          }
        });
        break;

      case 'payroll':
        this.reportsService.getPayrollReconciliation(undefined, this.currentMonth, this.currentYear, this.selectedDepartment).subscribe({
          next: (res: any) => {
            this.payrollData = res?.data || [];
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Failed to load payroll reconciliation report');
            this.isLoading = false;
          }
        });
        break;

      case 'headcount':
        this.reportsService.getHeadcountDemographics().subscribe({
          next: (res: any) => {
            this.headcountData = res?.data || null;
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Failed to load headcount demographics report');
            this.isLoading = false;
          }
        });
        break;
    }
  }

  exportCurrentReport(): void {
    switch (this.activeTab) {
      case 'attendance':
        this.reportsService.exportAttendanceSummary(this.currentMonth, this.currentYear, this.selectedDepartment).subscribe({
          next: (blob) => this.downloadFile(blob, `Attendance_Summary_${this.currentYear}_${this.currentMonth}.csv`),
          error: () => this.toastr.error('Export failed')
        });
        break;

      case 'leave':
        this.reportsService.exportLeaveBalance(this.selectedDepartment).subscribe({
          next: (blob) => this.downloadFile(blob, `Leave_Balances_${new Date().toISOString().substring(0, 10)}.csv`),
          error: () => this.toastr.error('Export failed')
        });
        break;

      case 'payroll':
        this.reportsService.exportPayrollReconciliation(undefined, this.currentMonth, this.currentYear, this.selectedDepartment).subscribe({
          next: (blob) => this.downloadFile(blob, `Payroll_Reconciliation_${this.currentYear}_${this.currentMonth}.csv`),
          error: () => this.toastr.error('Export failed')
        });
        break;

      case 'headcount':
        this.reportsService.exportHeadcountDemographics().subscribe({
          next: (blob) => this.downloadFile(blob, `Headcount_Demographics_${new Date().toISOString().substring(0, 10)}.csv`),
          error: () => this.toastr.error('Export failed')
        });
        break;
    }
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.toastr.success(`Downloaded ${filename}`);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
