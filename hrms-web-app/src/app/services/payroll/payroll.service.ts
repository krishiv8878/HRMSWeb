import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalaryComponent {
  id: number;
  name: string;
  code: string;
  type: string; // Earning | Deduction
  calculationType: string;
  defaultPercentage: number;
  defaultAmount: number;
  isTaxable: boolean;
  isStatutory: boolean;
  description?: string;
  isActive: boolean;
}

export interface SalaryCalculationResult {
  annualCtc: number;
  monthlyCtc: number;
  monthlyGross: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  monthlyTds: number;
  totalMonthlyDeductions: number;
  monthlyNetTakeHome: number;
  taxRegime: string;
}

export interface PayRun {
  id: number;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Disbursed';
  paymentMode: string;
  notes?: string;
  approvedDate?: string;
  disbursedDate?: string;
}

export interface PayRunEmployeeDetail {
  id: number;
  payRunId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  totalWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  lopDeduction: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  reimbursements: number;
  grossPay: number;
  epfDeduction: number;
  esicDeduction: number;
  ptDeduction: number;
  tdsDeduction: number;
  totalDeductions: number;
  netPay: number;
  paymentStatus: string;
  bankName: string;
  accountNumber?: number;
  ifscCode: string;
}

export interface PayslipDto {
  id: number;
  payRunId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  pan: string;
  month: number;
  year: number;
  payslipNumber: string;
  totalWorkingDays: number;
  presentDays: number;
  lopDays: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  reimbursements: number;
  grossSalary: number;
  epfDeduction: number;
  esicDeduction: number;
  ptDeduction: number;
  tdsDeduction: number;
  lopDeduction: number;
  totalDeductions: number;
  netSalary: number;
  generatedDate: string;
}

export interface ReimbursementClaim {
  id: number;
  employeeId: number;
  category: string;
  amount: number;
  billDate: string;
  billNumber?: string;
  merchantName?: string;
  description?: string;
  receiptUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  approvedAmount: number;
  reviewedDate?: string;
  reviewRemarks?: string;
}

export interface FullAndFinalSettlement {
  id: number;
  employeeId: number;
  resignationId?: number;
  relievingDate: string;
  tenureYears: number;
  lastDrawnBasicSalary: number;
  lastDrawnGrossSalary: number;
  unutilizedLeaveDays: number;
  leaveEncashmentAmount: number;
  isGratuityEligible: boolean;
  gratuityAmount: number;
  noticePeriodDays: number;
  noticePeriodShortfallDays: number;
  noticeRecoveryAmount: number;
  pendingSalaryDays: number;
  pendingSalaryAmount: number;
  approvedReimbursements: number;
  otherAllowances: number;
  otherDeductions: number;
  netSettlementAmount: number;
  status: 'Draft' | 'Approved' | 'Settled';
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Payroll`;

  // 1. Components & CTC
  getComponents(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/components`);
  }

  saveComponent(component: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/components`, component);
  }

  deleteComponent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/components/${id}`);
  }

  calculateCtc(req: { annualCtc: number; basicPercentage?: number; hraPercentage?: number; includePf?: boolean; includeEsic?: boolean; taxRegime?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calculate-ctc`, req);
  }

  getSalaryAssignment(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/salary-assignment/${employeeId}` : `${this.apiUrl}/salary-assignment`;
    return this.http.get<any>(url);
  }

  assignSalary(req: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salary-assignment`, req);
  }

  getAllSalaryAssignments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/salary-assignments-all`);
  }

  // 2. Pay Run Engine
  getPayRuns(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payruns`);
  }

  getPayRun(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payrun/${id}`);
  }

  createPayRun(req: { month: number; year: number; paymentMode?: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payrun/create`, req);
  }

  updatePayRunStatus(req: { payRunId: number; status: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payrun/status`, req);
  }

  deletePayRun(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/payrun/${id}`);
  }

  // 3. Bank Payout Export
  exportBankPayout(payRunId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payrun/${payRunId}/export-bank-payout`, {
      responseType: 'blob'
    });
  }

  // 4. Payslips
  getPayslips(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/payslips/${employeeId}` : `${this.apiUrl}/payslips`;
    return this.http.get<any>(url);
  }

  getPayslip(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payslip/${id}`);
  }

  viewPayslipHtml(id: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/payslip/${id}/view`, {
      responseType: 'text'
    });
  }

  // 5. Reimbursements
  getReimbursements(employeeId?: number): Observable<any> {
    const url = employeeId ? `${this.apiUrl}/reimbursements/${employeeId}` : `${this.apiUrl}/reimbursements`;
    return this.http.get<any>(url);
  }

  getAllPendingReimbursements(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reimbursements-pending`);
  }

  submitReimbursement(req: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reimbursements/submit`, req);
  }

  reviewReimbursement(req: { claimId: number; status: string; approvedAmount?: number; remarks?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reimbursements/review`, req);
  }

  // 6. FnF Settlement
  calculateFnF(req: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/fnf/calculate`, req);
  }

  getFnF(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/fnf/${employeeId}`);
  }

  updateFnFStatus(id: number, status: string, remarks?: string): Observable<any> {
    const params: any = { status };
    if (remarks) params.remarks = remarks;
    return this.http.post<any>(`${this.apiUrl}/fnf/${id}/status`, null, { params });
  }
}
