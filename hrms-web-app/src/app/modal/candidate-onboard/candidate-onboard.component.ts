import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

import { CandidateService } from '../../services/candidate/candidate.service';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { EmployeeshiftService } from '../../services/shift/employeeshift.service';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';
import { CandidateItem } from '../../interface/candidate.interface';

@Component({
  selector: 'app-candidate-onboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './candidate-onboard.component.html',
  styleUrl: './candidate-onboard.component.scss'
})
export class CandidateOnboardModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<CandidateOnboardModalComponent>);
  private fb = inject(FormBuilder);
  private candidateService = inject(CandidateService);
  private designationService = inject(DesignationservicesService);
  private employeeService = inject(EmployeeService);
  private shiftService = inject(EmployeeshiftService);
  private roleService = inject(RoleservicesService);
  private toaster = inject(ToastrService);
  private router = inject(Router);

  isSubmitting: boolean = false;
  onboardSuccess: boolean = false;
  createdResponse: any = null;

  designationsList: any[] = [];
  managersList: any[] = [];
  shiftsList: any[] = [];
  rolesList: any[] = [];

  departmentsList: string[] = [
    'Engineering & Technology',
    'Human Resources',
    'Product Management',
    'Quality Assurance (QA)',
    'UI/UX & Design',
    'Operations & Infrastructure',
    'Finance & Accounting',
    'Sales & Marketing'
  ];

  onboardForm!: FormGroup;

  // Breakdown figures for real-time visualization
  annualCtcNumber: number = 1200000;
  basicSalaryMonthly: number = 50000;
  hraMonthly: number = 20000;
  specialAllowanceMonthly: number = 20000;
  pfDeductionMonthly: number = 6000;
  grossSalaryMonthly: number = 90000;
  netTakeHomeMonthly: number = 84000;

  constructor(@Inject(MAT_DIALOG_DATA) public candidate: CandidateItem) {}

  ngOnInit(): void {
    // Determine baseline CTC from candidate expectedSalary
    let parsedCtc = 1200000;
    if (this.candidate?.expectedSalary) {
      const salStr = String(this.candidate.expectedSalary).replace(/[^0-9.]/g, '');
      const num = parseFloat(salStr);
      if (!isNaN(num) && num > 0) {
        parsedCtc = num <= 100 ? num * 100000 : num; // e.g. 14 LPA -> 1,400,000
      }
    }
    this.annualCtcNumber = parsedCtc;
    this.recalculateCtcBreakdown(this.annualCtcNumber);

    const defaultPw = `Hrms@${new Date().getFullYear()}!`;
    const todayStr = new Date().toISOString().substring(0, 10);

    this.onboardForm = this.fb.group({
      candidateId: [this.candidate?.id || this.candidate?.candidateId || 0],
      firstName: [this.candidate?.firstName || '', [Validators.required]],
      lastName: [this.candidate?.lastName || '', [Validators.required]],
      emailAddress: [this.candidate?.emailAddress || '', [Validators.required, Validators.email]],
      mobileNumber: [this.candidate?.mobileNumber || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      designationId: [0, [Validators.required]],
      designation: [this.candidate?.appliedRole || ''],
      department: ['Engineering & Technology', [Validators.required]],
      managerId: [0],
      shiftId: ['1'],
      dateOfJoining: [todayStr, [Validators.required]],
      gender: ['Male'],
      roleName: ['Employee'],
      annualCtc: [this.annualCtcNumber, [Validators.required, Validators.min(10000)]],
      basicSalary: [this.basicSalaryMonthly, [Validators.required]],
      hra: [this.hraMonthly, [Validators.required]],
      specialAllowance: [this.specialAllowanceMonthly, [Validators.required]],
      pfDeduction: [this.pfDeductionMonthly, [Validators.required]],
      grossMonthlySalary: [this.grossSalaryMonthly],
      netMonthlySalary: [this.netTakeHomeMonthly],
      temporaryPassword: [defaultPw, [Validators.required]],
      sendCredentialsEmail: [true]
    });

    this.loadDropdowns();
  }

  private loadDropdowns(): void {
    // 1. Designations
    this.designationService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.designationsList = list;
        if (list.length > 0) {
          // Attempt match with appliedRole
          const match = list.find((d: any) =>
            this.candidate?.appliedRole && d.designationName?.toLowerCase().includes(this.candidate.appliedRole.toLowerCase())
          );
          if (match) {
            this.onboardForm.patchValue({
              designationId: match.id,
              designation: match.designationName
            });
          } else {
            this.onboardForm.patchValue({
              designationId: list[0].id,
              designation: list[0].designationName
            });
          }
        }
      }
    });

    // 2. Managers
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.employeedata?.data || []);
        this.managersList = list.filter((e: any) => !e.isDeleted);
        if (this.managersList.length > 0) {
          this.onboardForm.patchValue({ managerId: this.managersList[0].id });
        }
      }
    });

    // 3. Shifts
    this.shiftService.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.shiftsList = list;
        if (list.length > 0) {
          this.onboardForm.patchValue({ shiftId: String(list[0].id) });
        }
      }
    });

    // 4. Roles
    this.roleService.getAllData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.rolesList = list;
      }
    });
  }

  onDesignationChange(event: any): void {
    const selectedId = Number(event.target.value);
    const found = this.designationsList.find(d => d.id === selectedId);
    if (found) {
      this.onboardForm.patchValue({
        designationId: found.id,
        designation: found.designationName
      });
    }
  }

  onAnnualCtcInput(event: any): void {
    const raw = Number(event.target.value) || 0;
    this.annualCtcNumber = raw;
    this.recalculateCtcBreakdown(raw);
    this.onboardForm.patchValue({
      annualCtc: raw,
      basicSalary: this.basicSalaryMonthly,
      hra: this.hraMonthly,
      specialAllowance: this.specialAllowanceMonthly,
      pfDeduction: this.pfDeductionMonthly,
      grossMonthlySalary: this.grossSalaryMonthly,
      netMonthlySalary: this.netTakeHomeMonthly
    });
  }

  onComponentChange(): void {
    const b = Number(this.onboardForm.get('basicSalary')?.value) || 0;
    const h = Number(this.onboardForm.get('hra')?.value) || 0;
    const s = Number(this.onboardForm.get('specialAllowance')?.value) || 0;
    const pf = Number(this.onboardForm.get('pfDeduction')?.value) || 0;

    this.basicSalaryMonthly = b;
    this.hraMonthly = h;
    this.specialAllowanceMonthly = s;
    this.pfDeductionMonthly = pf;
    this.grossSalaryMonthly = b + h + s;
    this.netTakeHomeMonthly = Math.max(0, this.grossSalaryMonthly - pf);

    this.onboardForm.patchValue({
      grossMonthlySalary: this.grossSalaryMonthly,
      netMonthlySalary: this.netTakeHomeMonthly
    });
  }

  recalculateCtcBreakdown(annualCtc: number): void {
    const monthlyCtc = Math.round(annualCtc / 12);
    // Basic: 50% of monthly CTC
    this.basicSalaryMonthly = Math.round(monthlyCtc * 0.50);
    // HRA: 20% of monthly CTC
    this.hraMonthly = Math.round(monthlyCtc * 0.20);
    // Special Allowance: 20% of monthly CTC
    this.specialAllowanceMonthly = Math.round(monthlyCtc * 0.20);
    // PF Deduction: 12% of Basic
    this.pfDeductionMonthly = Math.round(this.basicSalaryMonthly * 0.12);
    // Gross = Basic + HRA + Special
    this.grossSalaryMonthly = this.basicSalaryMonthly + this.hraMonthly + this.specialAllowanceMonthly;
    // Net In-Hand = Gross - PF
    this.netTakeHomeMonthly = Math.max(0, this.grossSalaryMonthly - this.pfDeductionMonthly);
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  formatLpa(annualVal: number): string {
    if (!annualVal) return '0 LPA';
    const lpa = (annualVal / 100000).toFixed(2);
    return `${lpa} LPA`;
  }

  copyCredentials(): void {
    if (!this.createdResponse) return;
    const text = `Portal URL: ${window.location.origin}/login\nEmail: ${this.createdResponse.email}\nTemporary Password: ${this.createdResponse.temporaryPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      this.toaster.success('Login credentials copied to clipboard!', 'Copied');
    });
  }

  viewNewEmployee(): void {
    this.dialogRef.close(true);
    if (this.createdResponse?.employeeId) {
      this.router.navigate(['/index/user-profile'], { queryParams: { id: this.createdResponse.employeeId } });
    } else {
      this.router.navigate(['/index/home']);
    }
  }

  closeModal(): void {
    this.dialogRef.close(this.onboardSuccess);
  }

  submitOnboarding(): void {
    if (this.onboardForm.invalid) {
      this.onboardForm.markAllAsTouched();
      this.toaster.error('Please complete all required fields with valid values.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const val = this.onboardForm.value;

    const payload = {
      candidateId: Number(val.candidateId),
      firstName: (val.firstName || '').trim(),
      lastName: (val.lastName || '').trim(),
      emailAddress: (val.emailAddress || '').trim(),
      mobileNumber: String(val.mobileNumber || '').trim(),
      designationId: Number(val.designationId || 0),
      designation: val.designation || 'Software Engineer',
      department: val.department || 'Engineering & Technology',
      managerId: Number(val.managerId || 0),
      shiftId: String(val.shiftId || '1'),
      dateOfJoining: val.dateOfJoining ? new Date(val.dateOfJoining).toISOString() : new Date().toISOString(),
      gender: val.gender || 'Male',
      roleName: val.roleName || 'Employee',
      annualCtc: Number(val.annualCtc),
      basicSalary: Number(val.basicSalary),
      hra: Number(val.hra),
      specialAllowance: Number(val.specialAllowance),
      pfDeduction: Number(val.pfDeduction),
      netMonthlySalary: Number(val.netMonthlySalary),
      temporaryPassword: val.temporaryPassword,
      sendCredentialsEmail: Boolean(val.sendCredentialsEmail),
      clientUrl: `${window.location.origin}/login`
    };

    this.candidateService.onboardCandidate(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        const data = res?.data || res;
        this.onboardSuccess = true;
        this.createdResponse = {
          employeeId: data?.employeeId || data?.id || 0,
          email: payload.emailAddress,
          temporaryPassword: payload.temporaryPassword,
          fullName: `${payload.firstName} ${payload.lastName}`.trim(),
          emailSent: data?.emailSent !== false
        };
        this.toaster.success(`Candidate '${this.createdResponse.fullName}' successfully hired & onboarded!`, 'Onboarding Complete');
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Error onboarding candidate:', err);
        const msg = err?.error?.message || err?.error?.responseMessage || 'Failed to complete onboarding.';
        this.toaster.error(msg, 'Onboarding Error');
      }
    });
  }
}
