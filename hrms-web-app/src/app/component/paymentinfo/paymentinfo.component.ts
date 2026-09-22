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
  ctcBreakdown: any | null;
  annualCtc: number;
  monthlyGross: number;
  monthlyNet: number;
  bankAccount: PaymentItem | null;
  hasBankConfigured: boolean;
  disbursements: any[];
  currentMonthDisbursement: any | null;
  isCreditedThisMonth: boolean;
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
  activeTab: 'disbursements' | 'accounts' | 'my-payslips' = 'disbursements';

  // LOP Rule state
  currentLopRuleLabel: string = '';

  // Month Selection
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

    this.lopService.settings$.subscribe(() => {
      this.currentLopRuleLabel = this.lopService.getRuleLabel();
    });

    // Check query params for employee pre-selection
    this.route.queryParams.subscribe(params => {
      const qEmpId = params['employeeId'];
      if (qEmpId && Number(qEmpId) > 0 && !this.autoOpenedForEmp && this.isAdminOrHr) {
        this.autoOpenedForEmp = true;
        setTimeout(() => {
          this.openAddForm(Number(qEmpId));
        }, 400);
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

  switchTab(tab: 'disbursements' | 'accounts' | 'my-payslips') {
    this.activeTab = tab;
    if (tab === 'my-payslips') {
      this.setupEmployeeView();
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

    this.allPayrollEmployees.forEach(emp => {
      const disb = emp.disbursements.find((d: any) => d.month === this.selectedMonth || d.monthYear === this.selectedMonth) || null;
      emp.currentMonthDisbursement = disb;
      emp.isCreditedThisMonth = !!disb;

      budgetSum += emp.monthlyNet || 0;

      if (disb) {
        creditedCnt++;
        creditedSum += Number(disb.netSalary) || emp.monthlyNet || 0;
      }

      if (emp.hasBankConfigured) {
        bankConfiguredCnt++;
      }
    });

    this.totalPayrollBudget = budgetSum;
    this.totalCreditedAmount = creditedSum;
    this.creditedCount = creditedCnt;
    this.pendingCount = Math.max(0, this.allPayrollEmployees.length - creditedCnt);
    this.bankCoverageRate = this.allPayrollEmployees.length > 0
      ? Math.round((bankConfiguredCnt / this.allPayrollEmployees.length) * 100)
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
      result = result.filter(emp => emp.isCreditedThisMonth);
    } else if (this.payrollStatusFilter === 'Pending') {
      result = result.filter(emp => !emp.isCreditedThisMonth);
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
      width: '640px',
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
    const list: any[] = Array.isArray(this.myEmployeeRecord.disbursements)
      ? [...this.myEmployeeRecord.disbursements]
      : [];

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
}
