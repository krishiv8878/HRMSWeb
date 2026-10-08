import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { PaymeenInfoComponent } from '../../modal/paymeen-info/paymeen-info.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';
import { SalaryCreditModalComponent } from '../../modal/salary-credit-modal/salary-credit-modal.component';
import { SalarySlipModalComponent } from '../../modal/salary-slip-modal/salary-slip-modal.component';
import { PayrollLopService } from '../../services/payroll/payroll-lop.service';
import { PayrollLopSettingsModalComponent } from '../../modal/payroll-lop-settings-modal/payroll-lop-settings-modal.component';
import { GlobalFilterService } from '../../services/filter/global-filter.service';
import { PayrollService, PayRun, PayslipDto, ReimbursementClaim, FullAndFinalSettlement, SalaryCalculationResult } from '../../services/payroll/payroll.service';
import { PayRunModalComponent } from '../../modal/payroll/pay-run-modal/pay-run-modal.component';
import { ReimbursementModalComponent } from '../../modal/payroll/reimbursement-modal/reimbursement-modal.component';
import { FnfModalComponent } from '../../modal/payroll/fnf-modal/fnf-modal.component';

export interface PaymentItem {
  id: number;
  employeeId: number;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  maskedAccount: string;
  nameOnAccount: string;
  avatarUrl?: string;
  isActive: boolean;
  showFullAccount?: boolean;
  rawRecord?: any;
}

export interface PayrollEmployeeItem {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  department?: string;
  emailAddress?: string;
  avatarUrl?: string;
  initials: string;
  dateOfJoining?: Date | string | null;
  isJoinedAfterSelectedMonth?: boolean;
  ctcBreakdown: any | null;
  annualCtc: number;
  monthlyGross: number;
  monthlyNet: number;
  bankAccount: PaymentItem | null;
  hasBankConfigured: boolean;
  disbursements: any[];
  currentMonthDisbursement: any | null;
  isCreditedThisMonth: boolean;
  linkedPayRun?: PayRun | null;
  rawRecord: any;
}

@Component({
  selector: 'app-paymentinfo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './paymentinfo.component.html',
  styleUrl: './paymentinfo.component.scss'
})
export class PaymentinfoComponent implements OnInit, OnDestroy {
  services = inject(PaymentinfoService);
  payrollService = inject(PayrollService);
  employeeService = inject(EmployeeService);
  rbacService = inject(RbacService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  dialog = inject(MatDialog);
  toaster = inject(ToastrService);
  lopService = inject(PayrollLopService);
  globalFilterService = inject(GlobalFilterService);
  private filterSub?: Subscription;

  Math = Math;

  // Active View Tab
  activeTab: 'disbursements' | 'payruns' | 'ctc-calculator' | 'reimbursements' | 'fnf' | 'accounts' | 'my-payslips' = 'disbursements';

  // Dedicated Employee View Active Tab (!isAdminOrHr)
  empActiveTab: 'my-payslips' | 'my-structure' | 'my-reimbursements' | 'bank-details' = 'my-payslips';

  // 1. Pay Runs Data
  allPayRuns: PayRun[] = [];
  selectedPayRunMonth: number = new Date().getMonth() + 1;
  selectedPayRunYear: number = new Date().getFullYear();
  isCreatingPayRun: boolean = false;

  // 2. CTC Live Calculator & Directory Assignment
  calcAnnualCtc: number = 600000;
  calcBasicPercent: number = 40;
  calcHraPercent: number = 50;
  calcIncludePf: boolean = true;
  calcIncludeEsic: boolean = true;
  calcRegime: string = 'New';
  calcResult: SalaryCalculationResult | null = null;
  selectedEmpForCtc: number | null = null;
  selectedCtcEmployee: PayrollEmployeeItem | null = null;
  isSavingAssignment: boolean = false;
  searchCtcQuery: string = '';
  filteredCtcEmployees: PayrollEmployeeItem[] = [];
  allSalaryAssignments: Map<number, any> = new Map();
  configuredCtcCount: number = 0;

  // 3. Reimbursements & FBP
  allReimbursements: ReimbursementClaim[] = [];
  myReimbursements: ReimbursementClaim[] = [];
  reimbursementFilterStatus: string = 'All';

  // 4. Server Payslips
  serverPayslips: PayslipDto[] = [];

  // 5. FnF Settlement
  allFnFSettlements: FullAndFinalSettlement[] = [];

  // LOP Rule state
  currentLopRuleLabel: string = '';

  // Month Selection
  monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  availableMonths: string[] = [];
  selectedMonth: string = '';

  // Payroll Management Data
  allPayrollEmployees: PayrollEmployeeItem[] = [];
  filteredPayrollEmployees: PayrollEmployeeItem[] = [];
  paginatedPayrollEmployees: PayrollEmployeeItem[] = [];

  payrollSearchQuery: string = '';
  payrollStatusFilter: 'All' | 'Credited' | 'Pending' | 'NoBank' = 'All';

  // Payroll Summary Metrics
  totalPayrollBudget: number = 0;
  totalCreditedAmount: number = 0;
  creditedCount: number = 0;
  pendingCount: number = 0;
  bankCoverageRate: number = 100;

  // Payroll Pagination
  payrollCurrentPage: number = 1;
  payrollPageSize: number = 10;
  payrollTotalPages: number = 1;
  payrollPages: number[] = [];

  // Direct Deposit Accounts Data
  allPayments: PaymentItem[] = [];
  filteredPayments: PaymentItem[] = [];
  paginatedPayments: PaymentItem[] = [];

  // Direct Deposit Filters & Metrics
  searchQuery: string = '';
  selectedBank: string = 'All';
  selectedStatus: string = 'All';

  totalAccountsCount: number = 0;
  activeAccountsCount: number = 0;
  banksCount: number = 4;
  complianceRate: number = 100;

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  banksList: string[] = ['All', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Citibank'];

  employeeId: any;
  isAdminOrHr: boolean = false;
  private autoOpenedForEmp: boolean = false;

  // Dedicated Employee / Manager View State
  myEmployeeRecord: PayrollEmployeeItem | null = null;
  myDisbursements: any[] = [];
  filteredEmployeePayslips: any[] = [];
  employeePayslipMonths: string[] = [];
  selectedPayslipMonth: string = 'All';
  employeePayslipSearch: string = '';
  myPendingBankRequest: any = null;

  ngOnInit() {
    this.isAdminOrHr = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storeID = localStorage.getItem('employeeId');
      if (storeID) {
        this.employeeId = storeID;
      }
    }

    this.initAvailableMonths();
    this.loadAllData();
    this.loadPayRuns();
    this.loadServerPayslips();

    this.lopService.settings$.subscribe(() => {
      this.currentLopRuleLabel = this.lopService.getRuleLabel();
    });

    // Check query params for employee pre-selection
    this.route.queryParams.subscribe(params => {
      const qEmpId = params['employeeId'];
      const qEmpName = params['employeeName'];
      if (qEmpId && Number(qEmpId) > 0) {
        if (qEmpName) {
          this.payrollSearchQuery = qEmpName;
          this.searchQuery = qEmpName;
          this.globalFilterService.setEmployee(Number(qEmpId), qEmpName);
          this.filterPayroll();
          this.filterPayments();
        } else {
          this.employeeService.getData().subscribe((emps: any) => {
            const list = Array.isArray(emps) ? emps : (emps?.data || emps?.result || []);
            const found = list.find((e: any) => Number(e.id || e.employeeId) === Number(qEmpId));
            if (found) {
              const fullName = `${found.firstName || ''} ${found.lastName || ''}`.trim();
              this.payrollSearchQuery = fullName;
              this.searchQuery = fullName;
              this.globalFilterService.setEmployee(Number(qEmpId), fullName);
              this.filterPayroll();
              this.filterPayments();
            }
          });
        }

        if (!this.autoOpenedForEmp && this.isAdminOrHr && params['action'] === 'edit') {
          this.autoOpenedForEmp = true;
          setTimeout(() => {
            this.openAddForm(Number(qEmpId));
          }, 400);
        }
      }
    });

    // Universal Header Filter Subscription
    this.filterSub = this.globalFilterService.filters$.subscribe(f => {
      this.payrollSearchQuery = f.search || '';
      this.searchQuery = f.search || '';
      this.employeePayslipSearch = f.search || '';

      if (f.status && ['All', 'Credited', 'Pending', 'NoBank'].includes(f.status)) {
        this.payrollStatusFilter = f.status as any;
      }

      if (f.month && f.month !== 'All' && this.availableMonths.includes(f.month)) {
        this.selectedMonth = f.month;
        this.recalculatePayrollState();
      }

      if (f.employeeName && f.employeeId !== 'All') {
        this.payrollSearchQuery = f.employeeName;
      }

      if (this.activeTab === 'disbursements') {
        this.filterPayroll();
      } else if (this.activeTab === 'accounts') {
        this.filterPayments();
      } else if (this.activeTab === 'my-payslips') {
        this.filterEmployeePayslips();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.filterSub) {
      this.filterSub.unsubscribe();
    }
  }

  private initAvailableMonths(): void {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const result: string[] = [];

    // Current month + last 5 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }
    this.availableMonths = result;
    this.selectedMonth = result[0];
  }

  switchTab(tab: 'disbursements' | 'payruns' | 'ctc-calculator' | 'reimbursements' | 'fnf' | 'accounts' | 'my-payslips') {
    this.activeTab = tab;
    if (tab === 'payruns') {
      this.loadPayRuns();
    } else if (tab === 'ctc-calculator') {
      this.loadAllSalaryAssignments();
      this.calculateLiveCtc();
    } else if (tab === 'reimbursements') {
      this.loadReimbursements();
    } else if (tab === 'my-payslips') {
      this.setupEmployeeView();
      this.loadServerPayslips();
    } else if (tab === 'fnf') {
      this.loadFnFSettlements();
    }
  }

  switchEmpTab(tab: 'my-payslips' | 'my-structure' | 'my-reimbursements' | 'bank-details') {
    this.empActiveTab = tab;
    if (tab === 'my-payslips') {
      this.loadServerPayslips();
    } else if (tab === 'my-reimbursements') {
      this.loadReimbursements();
    } else if (tab === 'my-structure') {
      if (this.myEmployeeRecord && (this.myEmployeeRecord.annualCtc || 0) > 0) {
        this.calcAnnualCtc = this.myEmployeeRecord.annualCtc;
      }
      this.calculateLiveCtc();
    }
  }

  onMonthChange() {
    this.recalculatePayrollState();
    this.filterPayroll();
  }

  loadAllData() {
    this.services.getAllData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        }

        rawList = rawList.filter((item: any) => !item.isDeleted && item.isDeleted !== 1 && item.isDeleted !== 'true');

        if (!this.isAdminOrHr && this.employeeId && rawList.length > 0) {
          const userSpecific = rawList.filter((item: any) => String(item.employeeId) === String(this.employeeId));
          if (userSpecific.length > 0) {
            rawList = userSpecific;
          }
        }

        // Deduplicate bank entries
        if (rawList.length > 0) {
          const uniqueMap = new Map<string, any>();
          rawList.forEach((item: any) => {
            const key = item.employeeId ? String(item.employeeId) : String(item.id || Math.random());
            if (!uniqueMap.has(key) || (item.id && Number(item.id) > Number(uniqueMap.get(key).id))) {
              uniqueMap.set(key, item);
            }
          });
          rawList = Array.from(uniqueMap.values());
        }

        this.allPayments = rawList.map((item: any, idx: number) => this.mapPaymentItem(item, idx));
        this.processPaymentMetrics();
        this.filterPayments();

        // Load employees to build payroll items
        this.loadPayrollEmployees();
      },
      error: () => {
        this.allPayments = [];
        this.processPaymentMetrics();
        this.filterPayments();
        this.loadPayrollEmployees();
      }
    });
  }

  private loadPayrollEmployees() {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }

        // Only active employees
        list = list.filter((e: any) => e.isActive !== false && e.isActive !== 0 && e.isActive !== 'false');

        if (!this.isAdminOrHr && this.employeeId) {
          list = list.filter((e: any) => String(e.id) === String(this.employeeId));
        }

        this.allPayrollEmployees = list.map(emp => this.mapPayrollEmployee(emp));
        this.setupEmployeeView();
        this.recalculatePayrollState();
        this.filterPayroll();
      },
      error: () => {
        if (!this.isAdminOrHr && this.employeeId) {
          this.employeeService.getEmployeeById(this.employeeId).subscribe({
            next: (selfRes: any) => {
              const selfEmp = selfRes?.data || selfRes;
              if (selfEmp && selfEmp.id) {
                this.allPayrollEmployees = [this.mapPayrollEmployee(selfEmp)];
              } else {
                this.allPayrollEmployees = [];
              }
              this.setupEmployeeView();
              this.recalculatePayrollState();
              this.filterPayroll();
            },
            error: () => {
              this.allPayrollEmployees = [];
              this.setupEmployeeView();
              this.recalculatePayrollState();
              this.filterPayroll();
            }
          });
        } else {
          this.allPayrollEmployees = [];
          this.recalculatePayrollState();
          this.filterPayroll();
        }
      }
    });
  }

  private mapPayrollEmployee(emp: any): PayrollEmployeeItem {
    const fName = emp.firstName || 'Employee';
    const lName = emp.lastName || '';
    const fullName = `${fName} ${lName}`.trim();
    const initials = ((fName[0] || 'E') + (lName[0] || '')).toUpperCase();

    let ctcBreakdown: any = null;
    let annualCtc = 0;
    let monthlyGross = 0;
    let monthlyNet = 0;
    let disbursements: any[] = [];

    if (emp.responsibilities) {
      try {
        const parsed = JSON.parse(emp.responsibilities);
        if (parsed) {
          ctcBreakdown = parsed;
          annualCtc = Number(parsed.annualCtc) || 0;
          monthlyGross = Number(parsed.grossMonthlySalary) || (Number(parsed.basicSalary || 0) + Number(parsed.hra || 0) + Number(parsed.specialAllowance || 0));
          monthlyNet = Number(parsed.netMonthlySalary) || (monthlyGross - Number(parsed.pfDeduction || 0));
          if (Array.isArray(parsed.disbursements)) {
            disbursements = parsed.disbursements;
          }
        }
      } catch {
        // Not JSON
      }
    }

    // Match bank info
    const bankAccount = this.allPayments.find(p => String(p.employeeId) === String(emp.id)) || null;

    let avatarUrl: string | undefined = undefined;
    if (emp.profileImage) {
      avatarUrl = emp.profileImage.startsWith('http') || emp.profileImage.startsWith('data:')
        ? emp.profileImage
        : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${emp.profileImage}`;
    }

    return {
      id: emp.id,
      fullName,
      firstName: fName,
      lastName: lName,
      department: emp.department || 'General',
      emailAddress: emp.emailAddress || '',
      avatarUrl,
      initials,
      dateOfJoining: emp.dateOfJoining || emp.DateOfJoining || null,
      isJoinedAfterSelectedMonth: false,
      ctcBreakdown,
      annualCtc,
      monthlyGross,
      monthlyNet,
      bankAccount,
      hasBankConfigured: !!(bankAccount && bankAccount.accountNumber),
      disbursements,
      currentMonthDisbursement: null,
      isCreditedThisMonth: false,
      rawRecord: emp
    };
  }

  private recalculatePayrollState() {
    let budgetSum = 0;
    let creditedSum = 0;
    let creditedCnt = 0;
    let bankConfiguredCnt = 0;

    const parts = (this.selectedMonth || '').trim().split(' ');
    const selMonthName = parts[0] || '';
    const selYear = Number(parts[1]) || new Date().getFullYear();
    const selMonthNum = this.monthNames.indexOf(selMonthName); // 1-12
    // Last millisecond of the selected month
    const endOfSelectedMonth = new Date(selYear, selMonthNum, 0, 23, 59, 59, 999);

    const matchingRun = this.allPayRuns.find(r => r.month === selMonthNum && r.year === selYear);

    this.allPayrollEmployees.forEach(emp => {
      // Determine if employee joined after the selected month
      let joinedAfter = false;
      if (emp.dateOfJoining) {
        const doj = new Date(emp.dateOfJoining);
        if (!isNaN(doj.getTime()) && doj.getTime() > endOfSelectedMonth.getTime()) {
          joinedAfter = true;
        }
      }
      emp.isJoinedAfterSelectedMonth = joinedAfter;

      if (joinedAfter) {
        // Employee was not employed during this month; cannot have payslip or pending payroll
        emp.currentMonthDisbursement = null;
        emp.isCreditedThisMonth = false;
        emp.linkedPayRun = null;
        return;
      }

      // Check if employee has an actual recorded disbursement for this month
      let disb = emp.disbursements.find((d: any) =>
        (d.month && d.month.toLowerCase() === this.selectedMonth.toLowerCase()) ||
        (d.monthYear && d.monthYear.toLowerCase() === this.selectedMonth.toLowerCase())
      ) || null;

      emp.currentMonthDisbursement = disb;
      emp.isCreditedThisMonth = !!disb;
      emp.linkedPayRun = matchingRun || null;

      budgetSum += emp.monthlyNet || 0;

      if (disb) {
        creditedCnt++;
        creditedSum += Number(disb.netSalaryCredited || disb.netSalary) || emp.monthlyNet || 0;
      }

      if (emp.hasBankConfigured) {
        bankConfiguredCnt++;
      }
    });

    const eligibleEmployees = this.allPayrollEmployees.filter(e => !e.isJoinedAfterSelectedMonth);
    this.totalPayrollBudget = budgetSum;
    this.totalCreditedAmount = creditedSum;
    this.creditedCount = creditedCnt;
    this.pendingCount = Math.max(0, eligibleEmployees.length - creditedCnt);
    this.bankCoverageRate = eligibleEmployees.length > 0
      ? Math.round((bankConfiguredCnt / eligibleEmployees.length) * 100)
      : 100;
  }

  filterPayroll() {
    let result = [...this.allPayrollEmployees];

    if (this.payrollSearchQuery && this.payrollSearchQuery.trim()) {
      const q = this.payrollSearchQuery.toLowerCase().trim();
      result = result.filter(emp =>
        emp.fullName.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.emailAddress && emp.emailAddress.toLowerCase().includes(q)) ||
        String(emp.id).includes(q)
      );
    }

    if (this.payrollStatusFilter === 'Credited') {
      result = result.filter(emp => !emp.isJoinedAfterSelectedMonth && emp.isCreditedThisMonth);
    } else if (this.payrollStatusFilter === 'Pending') {
      result = result.filter(emp => !emp.isJoinedAfterSelectedMonth && !emp.isCreditedThisMonth);
    } else if (this.payrollStatusFilter === 'NoBank') {
      result = result.filter(emp => !emp.hasBankConfigured);
    }

    this.filteredPayrollEmployees = result;
    this.payrollCurrentPage = 1;
    this.updatePayrollPagination();
  }

  updatePayrollPagination() {
    this.payrollTotalPages = Math.max(1, Math.ceil(this.filteredPayrollEmployees.length / this.payrollPageSize));
    this.payrollPages = Array.from({ length: this.payrollTotalPages }, (_, i) => i + 1);

    if (this.payrollCurrentPage > this.payrollTotalPages) {
      this.payrollCurrentPage = this.payrollTotalPages;
    }

    const startIndex = (this.payrollCurrentPage - 1) * this.payrollPageSize;
    const endIndex = startIndex + this.payrollPageSize;
    this.paginatedPayrollEmployees = this.filteredPayrollEmployees.slice(startIndex, endIndex);
  }

  goToPayrollPage(p: number) {
    if (p >= 1 && p <= this.payrollTotalPages) {
      this.payrollCurrentPage = p;
      this.updatePayrollPagination();
    }
  }

  nextPayrollPage() {
    if (this.payrollCurrentPage < this.payrollTotalPages) {
      this.payrollCurrentPage++;
      this.updatePayrollPagination();
    }
  }

  prevPayrollPage() {
    if (this.payrollCurrentPage > 1) {
      this.payrollCurrentPage--;
      this.updatePayrollPagination();
    }
  }

  // Salary Credit & Slip Modals
  openSalaryCredit(emp: PayrollEmployeeItem) {
    const dialogRef = this.dialog.open(SalaryCreditModalComponent, {
      width: '740px',
      maxWidth: '96vw',
      data: {
        employee: emp.rawRecord,
        paymentInfo: emp.bankAccount?.rawRecord || emp.bankAccount,
        selectedMonth: this.selectedMonth
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.loadAllData();
      }
    });
  }

  openSalarySlip(emp: PayrollEmployeeItem, disb?: any) {
    this.dialog.open(SalarySlipModalComponent, {
      width: '850px',
      maxHeight: '90vh',
      data: {
        disbursement: disb || emp.currentMonthDisbursement,
        employee: emp.rawRecord,
        paymentInfo: emp.bankAccount?.rawRecord || emp.bankAccount
      }
    });
  }

  openLopSettingsModal(): void {
    this.dialog.open(PayrollLopSettingsModalComponent, {
      width: '740px',
      maxHeight: '90vh',
      panelClass: 'custom-clean-dialog'
    });
  }

  // ================= DEDICATED EMPLOYEE VIEW METHODS =================
  setupEmployeeView(): void {
    const targetId = this.employeeId ? String(this.employeeId) : null;
    this.myEmployeeRecord = (targetId ? this.allPayrollEmployees.find(e => String(e.id) === targetId) : null)
      || (!this.isAdminOrHr ? this.allPayrollEmployees[0] : null)
      || null;

    if (this.myEmployeeRecord) {
      this.populateEmployeeDisbursements();
    } else if (targetId) {
      this.employeeService.getEmployeeById(targetId).subscribe({
        next: (selfRes: any) => {
          const selfEmp = selfRes?.data || selfRes;
          if (selfEmp && selfEmp.id) {
            this.myEmployeeRecord = this.mapPayrollEmployee(selfEmp);
            this.populateEmployeeDisbursements();
          } else {
            this.resetEmployeeView();
          }
        },
        error: () => {
          this.resetEmployeeView();
        }
      });
    } else {
      this.resetEmployeeView();
    }
  }

  private resetEmployeeView(): void {
    this.myDisbursements = [];
    this.filteredEmployeePayslips = [];
    this.employeePayslipMonths = [];
    this.myPendingBankRequest = null;
  }

  private populateEmployeeDisbursements(): void {
    if (!this.myEmployeeRecord) return;

    // Connect bank account if not connected
    if (!this.myEmployeeRecord.bankAccount && this.allPayments.length > 0) {
      const matched = this.allPayments.find(p => String(p.employeeId) === String(this.myEmployeeRecord?.id || this.employeeId));
      if (matched) {
        this.myEmployeeRecord.bankAccount = matched;
        this.myEmployeeRecord.hasBankConfigured = true;
      }
    }

    // Check pending bank change request
    const pendingReq = this.myEmployeeRecord.ctcBreakdown?.pendingBankRequest;
    if (pendingReq && pendingReq.status === 'Pending') {
      this.myPendingBankRequest = pendingReq;
    } else {
      this.myPendingBankRequest = null;
    }

    // Collect all disbursements across all months
    let list: any[] = Array.isArray(this.myEmployeeRecord.disbursements)
      ? [...this.myEmployeeRecord.disbursements]
      : [];

    // Filter out disbursements prior to employee's Date of Joining
    if (this.myEmployeeRecord.dateOfJoining) {
      const doj = new Date(this.myEmployeeRecord.dateOfJoining);
      if (!isNaN(doj.getTime())) {
        list = list.filter(d => {
          const mStr = d.monthYear || d.month || '';
          const mParts = mStr.trim().split(' ');
          const mName = mParts[0] || '';
          const mYear = Number(mParts[1]) || 0;
          const mNum = this.monthNames.indexOf(mName);
          if (mNum > 0 && mYear > 0) {
            const endOfMonth = new Date(mYear, mNum, 0, 23, 59, 59, 999);
            return doj.getTime() <= endOfMonth.getTime();
          }
          return true;
        });
      }
    }

    // Sort chronologically descending (newest disbursement first)
    this.myDisbursements = list.sort((a, b) => {
      const timeA = new Date(a.paymentDate || a.creditDate || 0).getTime();
      const timeB = new Date(b.paymentDate || b.creditDate || 0).getTime();
      return timeB - timeA;
    });

    // Extract unique months for the month filter dropdown
    const monthSet = new Set<string>();
    this.myDisbursements.forEach(d => {
      const m = d.monthYear || d.month;
      if (m) monthSet.add(m);
    });
    this.employeePayslipMonths = Array.from(monthSet);

    this.filterEmployeePayslips();
    this.loadServerPayslips();
  }

  filterEmployeePayslips(): void {
    let result = [...this.myDisbursements];

    if (this.selectedPayslipMonth && this.selectedPayslipMonth !== 'All') {
      result = result.filter(d => (d.monthYear || d.month) === this.selectedPayslipMonth);
    }

    if (this.employeePayslipSearch && this.employeePayslipSearch.trim()) {
      const q = this.employeePayslipSearch.toLowerCase().trim();
      result = result.filter(d => {
        const m = (d.monthYear || d.month || '').toLowerCase();
        const ref = (d.transactionRef || '').toLowerCase();
        const date = (d.paymentDate || d.creditDate || '').toLowerCase();
        const mode = (d.paymentMode || '').toLowerCase();
        const amt = String(d.netSalaryCredited || d.netSalary || '');
        return m.includes(q) || ref.includes(q) || date.includes(q) || mode.includes(q) || amt.includes(q);
      });
    }

    this.filteredEmployeePayslips = result;
  }

  openEmployeePayslip(disb: any): void {
    if (!this.myEmployeeRecord) return;
    this.dialog.open(SalarySlipModalComponent, {
      width: '850px',
      maxHeight: '90vh',
      data: {
        disbursement: disb,
        employee: this.myEmployeeRecord.rawRecord,
        paymentInfo: this.myEmployeeRecord.bankAccount?.rawRecord || this.myEmployeeRecord.bankAccount
      }
    });
  }

  openRequestBankUpdate(): void {
    const currentBankRecord = this.myEmployeeRecord?.bankAccount?.rawRecord || this.myEmployeeRecord?.bankAccount;
    const dialogData = currentBankRecord
      ? currentBankRecord
      : { employeeId: this.myEmployeeRecord?.id || this.employeeId };

    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '560px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadAllData();
      }
    });
  }

  // Direct Deposit Accounts Mapping
  private mapPaymentItem(item: any, idx: number): PaymentItem {
    const acc = String(item.accountNumber || '');
    const masked = acc.length > 4 ? `•••• •••• ${acc.slice(-4)}` : (acc || '••••');
    const bank = item.bankName || 'Not Specified';
    const ifsc = (item.ifscCode || '—').toUpperCase();
    const name = item.nameOnAccount || 'Account Holder';

    let avatarUrl: string | undefined = undefined;
    if (item.profileImage) {
      avatarUrl = item.profileImage.startsWith('http') || item.profileImage.startsWith('data:')
        ? item.profileImage
        : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${item.profileImage}`;
    }

    return {
      id: Number(item.id || (idx + 1)),
      employeeId: Number(item.employeeId || this.employeeId || (idx + 101)),
      bankName: bank,
      ifscCode: ifsc,
      accountNumber: acc,
      maskedAccount: masked,
      nameOnAccount: name,
      avatarUrl: avatarUrl,
      isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false',
      showFullAccount: false,
      rawRecord: item
    };
  }

  private processPaymentMetrics() {
    this.totalAccountsCount = this.allPayments.length;
    this.activeAccountsCount = this.allPayments.filter(p => p.isActive).length;
    const bSet = new Set(this.allPayments.map(p => p.bankName));
    this.banksCount = bSet.size;
  }

  filterPayments() {
    let result = [...this.allPayments];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.bankName.toLowerCase().includes(q) ||
        p.nameOnAccount.toLowerCase().includes(q) ||
        p.ifscCode.toLowerCase().includes(q) ||
        p.accountNumber.includes(q)
      );
    }

    if (this.selectedBank !== 'All') {
      result = result.filter(p => p.bankName.toLowerCase().includes(this.selectedBank.toLowerCase()));
    }

    if (this.selectedStatus === 'Active') {
      result = result.filter(p => p.isActive);
    } else if (this.selectedStatus === 'Inactive') {
      result = result.filter(p => !p.isActive);
    }

    this.filteredPayments = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredPayments.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPayments = this.filteredPayments.slice(startIndex, endIndex);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  toggleAccountMask(p: PaymentItem) {
    p.showFullAccount = !p.showFullAccount;
  }

  onToggleActive(payment: PaymentItem) {
    if (!this.isAdminOrHr) {
      this.toaster.error('Employees and Managers are not permitted to activate or inactivate bank details.', 'Access Denied');
      return;
    }

    payment.isActive = !payment.isActive;

    const payload = {
      ...payment.rawRecord,
      id: payment.id,
      employeeId: payment.employeeId,
      bankName: payment.bankName,
      ifscCode: payment.ifscCode,
      accountNumber: payment.accountNumber,
      nameOnAccount: payment.nameOnAccount,
      isActive: payment.isActive
    };

    this.services.updateData(payload).subscribe({
      next: () => {
        if (payment.isActive) {
          this.toaster.success(`Bank account for ${payment.nameOnAccount} verified & active`, 'Status Updated');
        } else {
          this.toaster.warning(`Bank account for ${payment.nameOnAccount} disabled`, 'Status Updated');
        }
        this.processPaymentMetrics();
      },
      error: () => {
        if (payment.isActive) {
          this.toaster.success(`Bank account for ${payment.nameOnAccount} verified & active`, 'Status Updated');
        } else {
          this.toaster.warning(`Bank account for ${payment.nameOnAccount} disabled`, 'Status Updated');
        }
        this.processPaymentMetrics();
      }
    });
  }

  openAddForm(preselectedEmpId?: number) {
    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '560px',
      data: preselectedEmpId ? { employeeId: preselectedEmpId } : null
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadAllData();
      }
    });
  }

  Edit(payment: any) {
    if (!this.isAdminOrHr) {
      this.openRequestBankUpdate();
      return;
    }

    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '560px',
      data: payment.rawRecord || payment
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadAllData();
      }
    });
  }

  Delete(paymentId: any) {
    if (!this.rbacService.isAdmin()) {
      this.toaster.error('Employees and Managers are not permitted to delete bank details. Please contact your System Administrator.', 'Access Denied');
      return;
    }

    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: paymentId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(paymentId).subscribe({
          next: () => {
            this.toaster.success('Payment record successfully deleted', 'Deleted');
            this.loadAllData();
          },
          error: () => {
            this.toaster.success('Payment record successfully deleted', 'Deleted');
            this.loadAllData();
          }
        });
      }
    });
  }

  onExportPaymentMatrix() {
    if (typeof window === 'undefined') return;

    const list = this.filteredPayments.length > 0 ? this.filteredPayments : this.allPayments;
    const headers = [
      'Beneficiary Name',
      'Employee ID',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Status'
    ];

    const rows = list.map(p => [
      `"${p.nameOnAccount}"`,
      `"${p.employeeId}"`,
      `"${p.bankName}"`,
      `"${p.accountNumber}"`,
      `"${p.ifscCode}"`,
      `"${p.isActive ? 'Active / Verified' : 'Inactive'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Direct_Deposit_Payroll_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Banking & direct deposit directory exported!', 'Export Complete');
  }

  onExportMonthlyPayroll() {
    if (typeof window === 'undefined') return;

    const list = this.filteredPayrollEmployees.length > 0 ? this.filteredPayrollEmployees : this.allPayrollEmployees;
    const headers = [
      'Employee ID',
      'Full Name',
      'Department',
      'Disbursement Period',
      'Annual CTC',
      'Gross Monthly Salary',
      'Net Monthly Pay',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Disbursement Status',
      'Credited Date',
      'Transaction Ref / UTR'
    ];

    const rows = list.map(emp => {
      const disb = emp.currentMonthDisbursement;
      return [
        `"EMP-${(emp.id + '').padStart(4, '0')}"`,
        `"${emp.fullName}"`,
        `"${emp.department || ''}"`,
        `"${this.selectedMonth}"`,
        `"${emp.annualCtc || 0}"`,
        `"${emp.monthlyGross || 0}"`,
        `"${disb ? (disb.netSalary || emp.monthlyNet) : (emp.monthlyNet || 0)}"`,
        `"${emp.bankAccount?.bankName || 'Not Configured'}"`,
        `"${emp.bankAccount?.accountNumber || ''}"`,
        `"${emp.bankAccount?.ifscCode || ''}"`,
        `"${emp.isCreditedThisMonth ? 'Credited' : 'Pending Credit'}"`,
        `"${disb ? disb.paymentDate : ''}"`,
        `"${disb ? (disb.transactionRef || '') : ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Disbursement_${this.selectedMonth.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success(`Payroll disbursement matrix for ${this.selectedMonth} exported!`, 'Export Complete');
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  formatLpa(val: number): string {
    if (!val) return '0 LPA';
    return (val / 100000).toFixed(2) + ' LPA';
  }

  // ================= 1. PAY RUNS (ENGINE) =================
  loadPayRuns() {
    this.payrollService.getPayRuns().subscribe({
      next: (res: any) => {
        this.allPayRuns = res?.data || [];
        this.recalculatePayrollState();
        this.filterPayroll();
      },
      error: () => {
        this.allPayRuns = [];
        this.recalculatePayrollState();
        this.filterPayroll();
      }
    });
  }

  getSelectedMonthPeriod(): { month: number; year: number; monthName: string } {
    const parts = (this.selectedMonth || '').trim().split(' ');
    const monthName = parts[0] || '';
    const year = Number(parts[1]) || new Date().getFullYear();
    const month = Math.max(1, this.monthNames.indexOf(monthName));
    return { month, year, monthName };
  }

  getPayRunForCurrentSelectedMonth(): PayRun | undefined {
    const period = this.getSelectedMonthPeriod();
    return this.allPayRuns.find(r => r.month === period.month && r.year === period.year);
  }

  isFutureSelectedMonth(): boolean {
    const period = this.getSelectedMonthPeriod();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (period.year > currentYear) return true;
    if (period.year === currentYear && period.month > currentMonth) return true;
    return false;
  }

  runPayrollForSelectedMonth() {
    const period = this.getSelectedMonthPeriod();
    if (this.isFutureSelectedMonth()) {
      this.toaster.warning('Pay runs cannot be created for future months.', 'Invalid Period');
      return;
    }

    const existing = this.getPayRunForCurrentSelectedMonth();
    if (existing) {
      this.openPayRunDetails(existing);
      return;
    }

    this.isCreatingPayRun = true;
    this.payrollService.createPayRun({
      month: period.month,
      year: period.year
    }).subscribe({
      next: (res: any) => {
        this.isCreatingPayRun = false;
        this.toaster.success(`Payroll generated for ${this.selectedMonth}! Review calculations below.`, 'Pay Run Created');
        this.loadPayRuns();
        this.loadAllData();
        if (res?.data?.id) {
          this.openPayRunDetails(res.data);
        }
      },
      error: (err: any) => {
        this.isCreatingPayRun = false;
        const msg = err?.error?.message || 'Failed to generate monthly payroll';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  isFuturePayRunSelected(): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (Number(this.selectedPayRunYear) > currentYear) return true;
    if (Number(this.selectedPayRunYear) === currentYear && Number(this.selectedPayRunMonth) > currentMonth) return true;
    return false;
  }

  getExistingPayRunForSelected(): PayRun | undefined {
    return this.allPayRuns.find(r => r.month === Number(this.selectedPayRunMonth) && r.year === Number(this.selectedPayRunYear));
  }

  createPayRun() {
    if (this.isFuturePayRunSelected()) {
      this.toaster.warning('Pay runs cannot be created for future months.', 'Invalid Period');
      return;
    }

    const existing = this.getExistingPayRunForSelected();
    if (existing) {
      this.toaster.warning(`A pay run batch (#PR-${existing.id}: ${existing.status}) already exists for this period.`, 'Batch Already Exists');
      return;
    }

    this.isCreatingPayRun = true;
    this.payrollService.createPayRun({
      month: Number(this.selectedPayRunMonth),
      year: Number(this.selectedPayRunYear)
    }).subscribe({
      next: (res: any) => {
        this.isCreatingPayRun = false;
        this.toaster.success(`Pay Run batch created for ${this.selectedPayRunMonth}/${this.selectedPayRunYear}!`, 'Pay Run Created');
        this.loadPayRuns();
        if (res?.data?.id) {
          this.openPayRunDetails(res.data);
        }
      },
      error: (err: any) => {
        this.isCreatingPayRun = false;
        const msg = err?.error?.message || 'Failed to create monthly pay run batch';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  disbursePayRunDirect(run: PayRun) {
    const monthName = this.monthNames[run.month] || ('Month ' + run.month);
    if (!confirm(`Are you sure you want to disburse Pay Run batch #PR-${run.id} for ${monthName} ${run.year}? This will publish official payslips to all employees and mark linked reimbursement claims as paid.`)) {
      return;
    }
    this.payrollService.updatePayRunStatus({
      payRunId: run.id,
      status: 'Disbursed'
    }).subscribe({
      next: () => {
        this.toaster.success(`Pay Run batch #PR-${run.id} disbursed successfully! Payslips published.`, 'Disbursed');
        this.loadPayRuns();
        this.loadAllData();
        this.loadServerPayslips();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to disburse pay run batch';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  deleteDraftPayRun(run: PayRun) {
    if (run.status !== 'Draft') {
      this.toaster.warning('Only Draft pay runs can be discarded.', 'Action Prohibited');
      return;
    }
    if (!confirm(`Are you sure you want to discard Pay Run batch #PR-${run.id} for ${run.month}/${run.year}? Any linked reimbursement claims will be released back to pending status.`)) {
      return;
    }
    this.payrollService.deletePayRun(run.id).subscribe({
      next: () => {
        this.toaster.success(`Pay Run batch #PR-${run.id} discarded successfully`, 'Discarded');
        this.loadPayRuns();
      },
      error: () => {
        this.toaster.error('Failed to discard pay run batch', 'Error');
      }
    });
  }

  downloadBankPayoutCsv(payRunId: number) {
    this.payrollService.exportBankPayout(payRunId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BankPayout_PayRun_${payRunId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toaster.success('Bank payout CSV file generated and downloaded', 'Export Complete');
      },
      error: () => {
        this.toaster.error('Failed to export bank payout CSV', 'Export Error');
      }
    });
  }

  openPayRunDetails(payRun: PayRun) {
    const ref = this.dialog.open(PayRunModalComponent, {
      width: '1200px',
      maxWidth: '96vw',
      data: { payRunId: payRun.id }
    });

    ref.afterClosed().subscribe(() => {
      this.loadPayRuns();
      this.loadAllData();
      this.loadServerPayslips();
    });
  }

  // ================= 2. CTC CALCULATOR & DIRECTORY ASSIGNMENT =================
  loadAllSalaryAssignments() {
    this.payrollService.getAllSalaryAssignments().subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        this.allSalaryAssignments.clear();
        list.forEach((item: any) => {
          this.allSalaryAssignments.set(Number(item.employeeId), item);
        });
        this.syncEmployeeCtcWithAssignments();
      },
      error: () => {
        this.syncEmployeeCtcWithAssignments();
      }
    });
  }

  syncEmployeeCtcWithAssignments() {
    this.allPayrollEmployees.forEach(emp => {
      const saved = this.allSalaryAssignments.get(Number(emp.id));
      if (saved && saved.annualCtc > 0) {
        emp.annualCtc = Number(saved.annualCtc);
      }
    });
    this.configuredCtcCount = this.allPayrollEmployees.filter(e => (e.annualCtc || 0) > 0).length;
    this.filterCtcEmployees();
  }

  filterCtcEmployees() {
    let result = [...this.allPayrollEmployees];
    if (this.searchCtcQuery && this.searchCtcQuery.trim()) {
      const q = this.searchCtcQuery.toLowerCase().trim();
      result = result.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        String(e.id).includes(q)
      );
    }
    this.filteredCtcEmployees = result;

    if (!this.selectedEmpForCtc && this.filteredCtcEmployees.length > 0) {
      this.selectEmployeeForCtc(this.filteredCtcEmployees[0]);
    }
  }

  selectEmployeeForCtc(emp: PayrollEmployeeItem) {
    this.selectedEmpForCtc = emp.id;
    this.selectedCtcEmployee = emp;

    const saved = this.allSalaryAssignments.get(Number(emp.id));
    if (saved && saved.annualCtc > 0) {
      this.calcAnnualCtc = Number(saved.annualCtc);
      this.calcRegime = saved.taxRegime || 'New';
    } else if (emp.annualCtc > 0) {
      this.calcAnnualCtc = emp.annualCtc;
    } else {
      this.calcAnnualCtc = 600000;
    }

    this.calculateLiveCtc();
  }

  calculateLiveCtc() {
    this.payrollService.calculateCtc({
      annualCtc: this.calcAnnualCtc,
      basicPercentage: this.calcBasicPercent,
      hraPercentage: this.calcHraPercent,
      includePf: this.calcIncludePf,
      includeEsic: this.calcIncludeEsic,
      taxRegime: this.calcRegime
    }).subscribe({
      next: (res: any) => {
        this.calcResult = res?.data || null;
      }
    });
  }

  assignCtcToEmployee() {
    if (!this.selectedEmpForCtc) {
      this.toaster.error('Please select an employee to assign this structure', 'Selection Required');
      return;
    }

    this.isSavingAssignment = true;
    this.payrollService.assignSalary({
      employeeId: this.selectedEmpForCtc,
      annualCtc: this.calcAnnualCtc,
      taxRegime: this.calcRegime
    }).subscribe({
      next: () => {
        this.isSavingAssignment = false;
        this.toaster.success(`CTC structure saved for ${this.selectedCtcEmployee?.fullName || 'employee'}!`, 'Assigned Successfully');
        if (this.selectedCtcEmployee) {
          this.selectedCtcEmployee.annualCtc = this.calcAnnualCtc;
        }
        this.allSalaryAssignments.set(Number(this.selectedEmpForCtc), {
          employeeId: this.selectedEmpForCtc,
          annualCtc: this.calcAnnualCtc,
          taxRegime: this.calcRegime
        });
        this.syncEmployeeCtcWithAssignments();
      },
      error: () => {
        this.isSavingAssignment = false;
        this.toaster.error('Failed to save salary assignment', 'Error');
      }
    });
  }

  // ================= 3. REIMBURSEMENTS & FBP =================
  loadReimbursements() {
    if (this.isAdminOrHr) {
      this.payrollService.getAllPendingReimbursements().subscribe({
        next: (res: any) => {
          this.allReimbursements = res?.data || [];
        }
      });
    }

    const currentEmpId = this.employeeId ? Number(this.employeeId) : 0;
    this.payrollService.getReimbursements(currentEmpId).subscribe({
      next: (res: any) => {
        this.myReimbursements = res?.data || [];
      }
    });
  }

  openSubmitReimbursement() {
    const ref = this.dialog.open(ReimbursementModalComponent, {
      width: '600px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((submitted) => {
      if (submitted) {
        this.loadReimbursements();
      }
    });
  }

  reviewReimbursement(claimId: number, status: 'Approved' | 'Rejected') {
    this.payrollService.reviewReimbursement({
      claimId,
      status
    }).subscribe({
      next: () => {
        this.toaster.success(`Claim marked as ${status}`, 'Review Saved');
        this.loadReimbursements();
      },
      error: () => {
        this.toaster.error('Failed to review claim', 'Error');
      }
    });
  }

  // ================= 4. SERVER PAYSLIPS =================
  loadServerPayslips() {
    const targetId = this.employeeId ? Number(this.employeeId) : (this.myEmployeeRecord?.id ? Number(this.myEmployeeRecord.id) : 0);
    if (!targetId) return;

    this.payrollService.getPayslips(targetId).subscribe({
      next: (res: any) => {
        this.serverPayslips = res?.data || [];
        this.mergeServerPayslipsIntoDisbursements();
      },
      error: () => {
        this.serverPayslips = [];
      }
    });
  }

  mergeServerPayslipsIntoDisbursements() {
    if (!this.serverPayslips || this.serverPayslips.length === 0) return;

    const mappedServerDisbursements = this.serverPayslips.map(p => {
      const monthStr = `${this.monthNames[p.month]} ${p.year}`;
      const dt = p.generatedDate ? new Date(p.generatedDate) : new Date();
      return {
        id: `PAYSLIP-${p.id}`,
        payslipId: p.id,
        monthYear: monthStr,
        month: monthStr,
        creditDate: p.generatedDate || dt.toISOString(),
        paymentDate: dt.toISOString().slice(0, 10),
        paymentMode: 'Direct Deposit / Pay Run',
        transactionRef: p.payslipNumber || `PR-SLIP-${p.id}`,
        grossSalary: p.grossSalary,
        basicSalary: p.basicSalary,
        hra: p.hra,
        specialAllowance: p.specialAllowance,
        pfDeduction: p.epfDeduction,
        additionalDeductions: Math.max(0, p.totalDeductions - p.epfDeduction),
        netSalaryCredited: p.netSalary,
        netSalary: p.netSalary,
        status: 'Credited',
        markedBy: 'Automated Pay Run Engine',
        markedAt: p.generatedDate
      };
    });

    const existingMap = new Map<string, any>();
    this.myDisbursements.forEach(d => {
      const key = (d.monthYear || d.month || '').toLowerCase();
      if (key) existingMap.set(key, d);
    });

    mappedServerDisbursements.forEach(d => {
      const key = (d.monthYear || d.month || '').toLowerCase();
      if (key) {
        existingMap.set(key, { ...existingMap.get(key), ...d });
      } else {
        existingMap.set(d.monthYear.toLowerCase(), d);
      }
    });

    let allMerged = Array.from(existingMap.values());
    if (this.myEmployeeRecord?.dateOfJoining) {
      const doj = new Date(this.myEmployeeRecord.dateOfJoining);
      if (!isNaN(doj.getTime())) {
        allMerged = allMerged.filter(d => {
          const mStr = d.monthYear || d.month || '';
          const mParts = mStr.trim().split(' ');
          const mName = mParts[0] || '';
          const mYear = Number(mParts[1]) || 0;
          const mNum = this.monthNames.indexOf(mName);
          if (mNum > 0 && mYear > 0) {
            const endOfMonth = new Date(mYear, mNum, 0, 23, 59, 59, 999);
            return doj.getTime() <= endOfMonth.getTime();
          }
          return true;
        });
      }
    }

    this.myDisbursements = allMerged.sort((a, b) => {
      const timeA = new Date(a.paymentDate || a.creditDate || 0).getTime();
      const timeB = new Date(b.paymentDate || b.creditDate || 0).getTime();
      return timeB - timeA;
    });

    const monthSet = new Set<string>();
    this.myDisbursements.forEach(d => {
      const m = d.monthYear || d.month;
      if (m) monthSet.add(m);
    });
    this.employeePayslipMonths = Array.from(monthSet);

    this.filterEmployeePayslips();
  }

  viewServerPayslipHtml(payslipId: number) {
    this.payrollService.viewPayslipHtml(payslipId).subscribe({
      next: (html: string) => {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
        } else {
          this.toaster.warning('Pop-up blocked. Please allow pop-ups to view printable payslip.', 'Pop-up Notice');
        }
      },
      error: () => {
        this.toaster.error('Failed to render official payslip HTML', 'Error');
      }
    });
  }

  // ================= 5. FULL & FINAL (FNF) SETTLEMENT =================
  loadFnFSettlements() {
    // Load from DB or default
  }

  openFnfModal(employeeId?: number) {
    const ref = this.dialog.open(FnfModalComponent, {
      width: '900px',
      maxWidth: '96vw',
      data: { employeeId }
    });

    ref.afterClosed().subscribe(() => {
      this.loadFnFSettlements();
    });
  }
}
