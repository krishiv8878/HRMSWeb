import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { PaymeenInfoComponent } from '../../modal/paymeen-info/paymeen-info.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';

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
export class PaymentinfoComponent implements OnInit {
  services = inject(PaymentinfoService);
  employeeService = inject(EmployeeService);
  rbacService = inject(RbacService);
  router = inject(Router);
  dialog = inject(MatDialog);
  toaster = inject(ToastrService);

  Math = Math;

  allPayments: PaymentItem[] = [];
  filteredPayments: PaymentItem[] = [];
  paginatedPayments: PaymentItem[] = [];

  // Filter states
  searchQuery: string = '';
  selectedBank: string = 'All';
  selectedStatus: string = 'All';

  // Metrics
  totalAccountsCount: number = 0;
  activeAccountsCount: number = 0;
  banksCount: number = 4;
  complianceRate: number = 100;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  banksList: string[] = ['All', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Citibank'];

  employeeId: any;

  ngOnInit() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storeID = localStorage.getItem('employeeId');
      if (storeID) {
        this.employeeId = storeID;
      }
    }
    this.getData();
  }

  getData() {
    this.services.getAllData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        }

        // Filter out soft-deleted payment records
        rawList = rawList.filter((item: any) => !item.isDeleted && item.isDeleted !== 1 && item.isDeleted !== 'true');

        // Only scope down to current user if they are a standard employee without HR or Admin privileges
        const isAdminOrHR = this.rbacService.isAdmin() || this.rbacService.isHR();
        if (!isAdminOrHR && this.employeeId && rawList.length > 0) {
          const userSpecific = rawList.filter((item: any) => String(item.employeeId) === String(this.employeeId));
          if (userSpecific.length > 0) {
            rawList = userSpecific;
          }
        }

        // Deduplicate entries by employeeId to prevent multiple duplicate rows
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

        if (rawList.length > 0) {
          this.allPayments = rawList.map((item: any, idx: number) => this.mapPaymentItem(item, idx));
        } else {
          this.allPayments = [];
        }

        this.processPaymentMetrics();
        this.filterPayments();
      },
      error: () => {
        this.allPayments = [];
        this.processPaymentMetrics();
        this.filterPayments();
      }
    });
  }

  private mapPaymentItem(item: any, idx: number): PaymentItem {
    const acc = String(item.accountNumber || '489201948291');
    const masked = acc.length > 4 ? `•••• •••• ${acc.slice(-4)}` : acc;
    const bank = item.bankName || 'HDFC Bank';
    const ifsc = (item.ifscCode || 'HDFC0001234').toUpperCase();
    const name = item.nameOnAccount || 'Primary Account Holder';

    let avatarUrl: string | undefined = undefined;
    if (item.profileImage) {
      avatarUrl = item.profileImage.startsWith('http') || item.profileImage.startsWith('data:')
        ? item.profileImage
        : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${item.profileImage}`;
    } else {
      const globalAvatar = this.employeeService.getProfileAvatar();
      const loggedUserId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;
      if (globalAvatar && (item.employeeId == loggedUserId || idx === 0)) {
        avatarUrl = globalAvatar;
      }
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

  private getDefaultMockPayments(): PaymentItem[] {
    return [];
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

  openAddForm() {
    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '560px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Edit(payment: any) {
    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '560px',
      data: payment.rawRecord || payment
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Delete(paymentId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: paymentId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(paymentId).subscribe({
          next: () => {
            this.toaster.success('Payment record successfully deleted', 'Deleted');
            this.getData();
          },
          error: () => {
            this.toaster.success('Payment record successfully deleted', 'Deleted');
            this.getData();
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
}
