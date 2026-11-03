import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PayrollService, PayRun, PayRunEmployeeDetail } from '../../../services/payroll/payroll.service';

@Component({
  selector: 'app-pay-run-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './pay-run-modal.component.html',
  styleUrls: ['./pay-run-modal.component.scss']
})
export class PayRunModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<PayRunModalComponent>);
  public data: { payRunId: number } = inject(MAT_DIALOG_DATA);
  private payrollService = inject(PayrollService);
  private toaster = inject(ToastrService);

  payRun: PayRun | null = null;
  employees: PayRunEmployeeDetail[] = [];
  isLoading = true;
  isUpdating = false;

  // Filter & Review State
  filterMode: 'all' | 'exceptions' | 'on-hold' = 'all';

  // Adjustment Modal State
  adjustmentModalOpen = false;
  currentAdjustment: {
    detailId: number;
    employeeName: string;
    manualAdjustment: number;
    arrears: number;
    bonus: number;
    reason: string;
  } | null = null;

  monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  ngOnInit() {
    this.loadDetails();
  }

  loadDetails() {
    this.isLoading = true;
    this.payrollService.getPayRun(this.data.payRunId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.data) {
          this.payRun = res.data.payRun || res.data.PayRun;
          this.employees = res.data.employees || res.data.Employees || [];
        }
      },
      error: () => {
        this.isLoading = false;
        this.toaster.error('Failed to load pay run details', 'Error');
      }
    });
  }

  get filteredEmployees(): PayRunEmployeeDetail[] {
    if (this.filterMode === 'exceptions') {
      return this.employees.filter(e => e.hasExceptionFlag);
    }
    if (this.filterMode === 'on-hold') {
      return this.employees.filter(e => e.isOnHold);
    }
    return this.employees;
  }

  get exceptionCount(): number {
    return this.employees.filter(e => e.hasExceptionFlag).length;
  }

  get onHoldCount(): number {
    return this.employees.filter(e => e.isOnHold).length;
  }

  updateStatus(newStatus: string) {
    if (!this.payRun) return;
    this.isUpdating = true;
    this.payrollService.updatePayRunStatus({
      payRunId: this.payRun.id,
      status: newStatus
    }).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toaster.success(`Pay run status updated to ${newStatus}`, 'Success');
        this.loadDetails();
      },
      error: (err: any) => {
        this.isUpdating = false;
        const msg = err?.error?.message || 'Failed to update status';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  lockPayRun() {
    if (!this.payRun) return;
    if (!confirm(`Are you sure you want to lock Pay Run batch #PR-${this.payRun.id}? Locking seals this pay period against attendance edits, recalculations, and accidental modifications.`)) {
      return;
    }
    this.isUpdating = true;
    this.payrollService.lockPayRun(this.payRun.id).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toaster.success(`Pay run #PR-${this.payRun?.id} is now locked & sealed.`, 'Pay Run Locked');
        this.loadDetails();
      },
      error: (err: any) => {
        this.isUpdating = false;
        const msg = err?.error?.message || 'Failed to lock pay run';
        this.toaster.error(msg, 'Lock Error');
      }
    });
  }

  recalculatePayRun() {
    if (!this.payRun) return;
    this.isUpdating = true;
    this.payrollService.recalculatePayRun(this.payRun.id).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toaster.success(`Pay run recalculated with all latest adjustments & loan deductions.`, 'Recalculation Complete');
        this.loadDetails();
      },
      error: (err: any) => {
        this.isUpdating = false;
        const msg = err?.error?.message || 'Failed to recalculate pay run';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  toggleHold(emp: PayRunEmployeeDetail) {
    if (!this.payRun) return;
    if (this.payRun.isLocked || this.payRun.status === 'Locked' || this.payRun.status === 'Disbursed' || this.payRun.status === 'Paid') {
      this.toaster.warning('Cannot change hold status on a locked or disbursed pay run.', 'Prohibited');
      return;
    }

    if (emp.isOnHold) {
      if (!confirm(`Release hold for ${emp.employeeName}? Net salary will be reinstated in payout.`)) {
        return;
      }
      this.isUpdating = true;
      this.payrollService.toggleHoldDetail({
        detailId: emp.id,
        isOnHold: false,
        reason: undefined
      }).subscribe({
        next: () => {
          this.isUpdating = false;
          this.toaster.success(`Hold released for ${emp.employeeName}`, 'Hold Released');
          this.loadDetails();
        },
        error: (err: any) => {
          this.isUpdating = false;
          this.toaster.error(err?.error?.message || 'Failed to release hold', 'Error');
        }
      });
    } else {
      const reason = prompt(`Enter reason for putting ${emp.employeeName}'s salary on hold (e.g. Missing bank verification, Pending clearance, Disciplinary inquiry):`);
      if (reason === null) return; // User cancelled
      this.isUpdating = true;
      this.payrollService.toggleHoldDetail({
        detailId: emp.id,
        isOnHold: true,
        reason: reason || 'Under Administrative Review'
      }).subscribe({
        next: () => {
          this.isUpdating = false;
          this.toaster.warning(`Salary for ${emp.employeeName} placed on hold.`, 'Salary On Hold');
          this.loadDetails();
        },
        error: (err: any) => {
          this.isUpdating = false;
          this.toaster.error(err?.error?.message || 'Failed to place on hold', 'Error');
        }
      });
    }
  }

  openAdjustmentModal(emp: PayRunEmployeeDetail) {
    if (!this.payRun) return;
    if (this.payRun.isLocked || this.payRun.status === 'Locked' || this.payRun.status === 'Disbursed' || this.payRun.status === 'Paid') {
      this.toaster.warning('Cannot adjust figures on a locked or disbursed pay run.', 'Prohibited');
      return;
    }

    this.currentAdjustment = {
      detailId: emp.id,
      employeeName: emp.employeeName,
      manualAdjustment: emp.manualAdjustmentAmount || 0,
      arrears: emp.arrearsAmount || 0,
      bonus: emp.bonusAmount || 0,
      reason: emp.adjustmentReason || ''
    };
    this.adjustmentModalOpen = true;
  }

  closeAdjustmentModal() {
    this.adjustmentModalOpen = false;
    this.currentAdjustment = null;
  }

  saveAdjustment() {
    if (!this.currentAdjustment) return;
    this.isUpdating = true;
    this.payrollService.updateDetailAdjustment({
      detailId: this.currentAdjustment.detailId,
      manualAdjustmentAmount: Number(this.currentAdjustment.manualAdjustment) || 0,
      arrearsAmount: Number(this.currentAdjustment.arrears) || 0,
      bonusAmount: Number(this.currentAdjustment.bonus) || 0,
      adjustmentReason: this.currentAdjustment.reason
    }).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toaster.success(`Adjustments saved and net pay recalculated for ${this.currentAdjustment?.employeeName}`, 'Adjusted');
        this.closeAdjustmentModal();
        this.loadDetails();
      },
      error: (err: any) => {
        this.isUpdating = false;
        this.toaster.error(err?.error?.message || 'Failed to save adjustments', 'Error');
      }
    });
  }

  discardPayRun() {
    if (!this.payRun) return;
    if (this.payRun.isLocked || this.payRun.status === 'Locked' || this.payRun.status === 'Disbursed' || this.payRun.status === 'Paid') {
      this.toaster.warning('Cannot discard a locked or disbursed pay run.', 'Action Prohibited');
      return;
    }
    if (!confirm(`Are you sure you want to discard Pay Run batch #PR-${this.payRun.id}? Any associated reimbursement claims will be released back to pending status.`)) {
      return;
    }
    this.isUpdating = true;
    this.payrollService.deletePayRun(this.payRun.id).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toaster.success(`Pay run #PR-${this.payRun?.id} discarded successfully`, 'Discarded');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isUpdating = false;
        this.toaster.error(err?.error?.message || 'Failed to discard pay run', 'Error');
      }
    });
  }

  downloadBankPayoutCsv() {
    if (!this.payRun) return;
    this.payrollService.exportBankPayout(this.payRun.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BankPayout_PayRun_${this.payRun?.id}_${this.payRun?.month}_${this.payRun?.year}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toaster.success('Bank payout CSV file generated successfully', 'Exported');
      },
      error: () => {
        this.toaster.error('Failed to export payout CSV', 'Export Error');
      }
    });
  }

  formatCurrency(val: number): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  getStatusSlug(status?: string): string {
    return (status || 'draft').toLowerCase().replace(/\s+/g, '-');
  }

  close() {
    this.dialogRef.close();
  }
}
