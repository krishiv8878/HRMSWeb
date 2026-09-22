import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import {
  PayrollLopService,
  PayrollLopSettings,
  LopCalculationBase,
  LopDivisorBasis
} from '../../services/payroll/payroll-lop.service';

@Component({
  selector: 'app-payroll-lop-settings-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './payroll-lop-settings-modal.component.html',
  styleUrl: './payroll-lop-settings-modal.component.scss'
})
export class PayrollLopSettingsModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<PayrollLopSettingsModalComponent>);
  private lopService = inject(PayrollLopService);
  private toaster = inject(ToastrService);

  // Settings State
  settings: PayrollLopSettings = {
    calculationBase: 'monthly_gross',
    divisorBasis: 'actual_days',
    includeUnpaidLeaves: true,
    includeUnexcusedAbsents: true,
    customBasePercentage: 100
  };

  // Live Simulator Inputs
  sampleGrossSalary: number = 90000;
  sampleBasicSalary: number = 45000;
  sampleAnnualCtc: number = 1080000;
  sampleLopDays: number = 2;
  sampleMonthDays: number = 30;
  sampleWorkingDays: number = 22;

  // Simulator Outputs
  simulatedDailyRate: number = 0;
  simulatedTotalDeduction: number = 0;
  simulatedFormulaStr: string = '';

  calculationBases: { id: LopCalculationBase; title: string; subtitle: string; icon: string }[] = [
    {
      id: 'monthly_gross',
      title: 'Monthly Gross Salary',
      subtitle: 'CTC ÷ 12 (Basic + HRA + Allowances) • Standard Corporate Standard',
      icon: 'payments'
    },
    {
      id: 'basic_only',
      title: 'Basic Salary Component Only',
      subtitle: 'Deduct exclusively against Basic wage (retains allowances)',
      icon: 'account_balance_wallet'
    },
    {
      id: 'annual_ctc',
      title: 'Total Cost to Company (CTC)',
      subtitle: 'Annualized cost base divided across annual working span',
      icon: 'donut_small'
    }
  ];

  divisorOptions: { id: LopDivisorBasis; title: string; subtitle: string; daysBadge: string }[] = [
    {
      id: 'actual_days',
      title: 'Actual Days in Month',
      subtitle: 'Dynamic divisor based on calendar length (28, 29, 30, or 31 days)',
      daysBadge: '28-31 Days'
    },
    {
      id: 'fixed_30',
      title: 'Fixed 30 Calendar Days',
      subtitle: 'Standardized 30-day divisor for all calendar months',
      daysBadge: '30 Days'
    },
    {
      id: 'fixed_26',
      title: 'Fixed 26 Working Days',
      subtitle: 'Standard Indian labor convention (excludes 4 Sundays)',
      daysBadge: '26 Days'
    },
    {
      id: 'working_days',
      title: 'Actual Working Days in Month',
      subtitle: 'Calendar days minus weekends and official company holidays',
      daysBadge: '~21-23 Days'
    }
  ];

  ngOnInit(): void {
    this.settings = { ...this.lopService.getSettings() };
    this.updateSimulation();
  }

  setCalculationBase(base: LopCalculationBase): void {
    this.settings.calculationBase = base;
    this.updateSimulation();
  }

  setDivisorBasis(divisor: LopDivisorBasis): void {
    this.settings.divisorBasis = divisor;
    this.updateSimulation();
  }

  updateSimulation(): void {
    this.simulatedDailyRate = this.lopService.calculatePerDayRate(
      this.sampleGrossSalary,
      this.sampleBasicSalary,
      this.sampleAnnualCtc,
      this.sampleMonthDays,
      this.sampleWorkingDays,
      this.settings
    );

    this.simulatedTotalDeduction = this.lopService.calculateTotalDeduction(
      this.sampleLopDays,
      this.simulatedDailyRate
    );

    let baseText = `₹ ${this.sampleGrossSalary.toLocaleString('en-IN')}`;
    if (this.settings.calculationBase === 'basic_only') {
      baseText = `₹ ${this.sampleBasicSalary.toLocaleString('en-IN')}`;
    } else if (this.settings.calculationBase === 'annual_ctc') {
      baseText = `(₹ ${this.sampleAnnualCtc.toLocaleString('en-IN')} ÷ 12)`;
    }

    let divNum = 30;
    if (this.settings.divisorBasis === 'fixed_26') divNum = 26;
    if (this.settings.divisorBasis === 'working_days') divNum = this.sampleWorkingDays;
    if (this.settings.divisorBasis === 'actual_days') divNum = this.sampleMonthDays;

    this.simulatedFormulaStr = `${baseText} ÷ ${divNum} Days = ₹ ${this.simulatedDailyRate.toLocaleString('en-IN')} / LOP day`;
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  resetDefaults(): void {
    this.settings = this.lopService.resetToDefault();
    this.updateSimulation();
    this.toaster.info('Calculation rules restored to default corporate standard.', 'Defaults Restored');
  }

  saveSettings(): void {
    this.lopService.saveSettings(this.settings);
    this.toaster.success('Payroll LOP & Deduction calculation settings saved successfully!', 'Settings Saved');
    this.dialogRef.close(this.settings);
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
