import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SalaryDisbursementRecord } from '../salary-credit-modal/salary-credit-modal.component';

@Component({
  selector: 'app-salary-slip-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './salary-slip-modal.component.html',
  styleUrl: './salary-slip-modal.component.scss'
})
export class SalarySlipModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<SalarySlipModalComponent>);

  employee: any = null;
  disbursement!: SalaryDisbursementRecord;
  bankInfo: any = null;

  totalEarnings: number = 0;
  totalDeductions: number = 0;
  netPayableWords: string = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    this.employee = this.data?.employee || {};
    this.disbursement = this.data?.disbursement || this.getFallbackDisbursement();
    this.bankInfo = this.data?.bankInfo || {
      bankName: this.disbursement.bankName || 'Direct Deposit',
      accountNumber: this.disbursement.accountNumber || '—',
      ifscCode: this.disbursement.ifscCode || '—'
    };

    this.calculateTotals();
  }

  private getFallbackDisbursement(): SalaryDisbursementRecord {
    return {
      id: 'DISB-DEFAULT',
      monthYear: 'September 2026',
      creditDate: new Date().toISOString(),
      paymentMode: 'Direct Bank Transfer (NEFT)',
      transactionRef: 'NEFT-20260930-109283',
      grossSalary: 90000,
      basicSalary: 50000,
      hra: 20000,
      specialAllowance: 20000,
      pfDeduction: 6000,
      additionalDeductions: 0,
      bonusAmount: 0,
      netSalaryCredited: 84000,
      status: 'Credited',
      markedBy: 'HR Operations',
      markedAt: new Date().toISOString()
    };
  }

  private calculateTotals(): void {
    const d = this.disbursement;
    this.totalEarnings = (d.basicSalary || 0) + (d.hra || 0) + (d.specialAllowance || 0) + (d.bonusAmount || 0);
    this.totalDeductions = (d.pfDeduction || 0) + (d.additionalDeductions || 0);
    this.netPayableWords = this.numberToWords(d.netSalaryCredited || 0);
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  printSlip(): void {
    window.print();
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  numberToWords(num: number): string {
    if (!num || num === 0) return 'Zero Rupees Only';

    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatHundreds = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else {
        str += a[n];
      }
      return str.trim();
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) result += formatHundreds(crore) + ' Crore ';
    if (lakh > 0) result += formatHundreds(lakh) + ' Lakh ';
    if (thousand > 0) result += formatHundreds(thousand) + ' Thousand ';
    if (remainder > 0) result += formatHundreds(remainder);

    return result.trim() + ' Rupees Only';
  }
}
