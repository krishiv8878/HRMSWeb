import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PayrollService, PayRun, PayRunEmployeeDetail } from '../../../services/payroll/payroll.service';

@Component({
  selector: 'app-pay-run-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
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
      error: (err) => {
        this.isLoading = false;
        this.toaster.error('Failed to load pay run details', 'Error');
      }
    });
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
      error: () => {
        this.isUpdating = false;
        this.toaster.error('Failed to update status', 'Error');
      }
    });
  }

  discardPayRun() {
    if (!this.payRun) return;
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
      error: () => {
        this.isUpdating = false;
        this.toaster.error('Failed to discard pay run', 'Error');
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

  close() {
    this.dialogRef.close();
  }
}
