import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  policyLimitPerClaim: number;
  policyMonthlyCap: number;
  isReceiptRequired: boolean;
  receiptRequiredThreshold: number;
  isMileageCategory: boolean;
  mileageRatePerKm: number;
  glAccountCode?: string;
  isActive: boolean;
}

export interface ExpenseItemDto {
  id: number;
  expenseReportId: number;
  expenseCategoryId: number;
  categoryName: string;
  expenseDate: string;
  merchantName?: string;
  description?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  receiptUrl?: string;
  status: string; // Draft, Submitted, Approved, Rejected
  reviewerRemarks?: string;
}

export interface ExpenseMileageDto {
  id: number;
  expenseReportId: number;
  vehicleType: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  ratePerKm: number;
  calculatedAmount: number;
  tripDate: string;
  purpose?: string;
}

export interface ExpenseAdvanceDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  requestedAmount: number;
  disbursedAmount?: number;
  reason: string;
  expectedTravelStartDate?: string;
  expectedTravelEndDate?: string;
  status: string; // Requested, Approved, Disbursed, Settled, Rejected
  approvedDate?: string;
  disbursedDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface ExpenseReportDetailDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  reportNumber: string;
  title: string;
  description?: string;
  status: string; // Draft, Submitted, ManagerApproved, FinanceApproved, Paid, Rejected
  totalClaimAmount: number;
  approvedAmount: number;
  advanceAdjustedAmount: number;
  netPayableAmount: number;
  submittedDate?: string;
  managerApprovedDate?: string;
  managerReviewerName?: string;
  managerRemarks?: string;
  financeApprovedDate?: string;
  financeReviewerName?: string;
  financeRemarks?: string;
  paidDate?: string;
  paymentMode?: string;
  paymentReference?: string;
  expenseAdvanceId?: number;
  createdAt: string;
  items: ExpenseItemDto[];
  mileageItems: ExpenseMileageDto[];
}

export interface CreateExpenseItemRequest {
  expenseCategoryId: number;
  expenseDate: string;
  merchantName?: string;
  description?: string;
  amount: number;
  taxAmount: number;
  receiptUrl?: string;
}

export interface CreateExpenseMileageRequest {
  vehicleType: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  tripDate: string;
  purpose?: string;
}

export interface CreateExpenseReportRequest {
  title: string;
  description?: string;
  expenseAdvanceId?: number;
  items: CreateExpenseItemRequest[];
  mileageItems: CreateExpenseMileageRequest[];
}

export interface ApproveExpenseRequest {
  reportId: number;
  stage: 'Manager' | 'Finance';
  isApproved: boolean;
  remarks?: string;
  itemDecisions?: {
    itemId: number;
    isApproved: boolean;
    remarks?: string;
  }[];
}

export interface DisburseExpenseRequest {
  reportId: number;
  paymentMode: string;
  paymentReference?: string;
  syncWithPayroll: boolean;
  notes?: string;
}

export interface RequestAdvanceDto {
  requestedAmount: number;
  reason: string;
  expectedTravelStartDate?: string;
  expectedTravelEndDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Expense`;

  // Categories
  getCategories(): Observable<ExpenseCategory[]> {
    return this.http.get<ExpenseCategory[]>(`${this.apiUrl}/categories`);
  }

  saveCategory(category: Partial<ExpenseCategory>): Observable<ExpenseCategory> {
    if (category.id) {
      return this.http.put<ExpenseCategory>(`${this.apiUrl}/categories/${category.id}`, category);
    }
    return this.http.post<ExpenseCategory>(`${this.apiUrl}/categories`, category);
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/categories/${id}`);
  }

  // Reports
  getMyReports(): Observable<ExpenseReportDetailDto[]> {
    return this.http.get<ExpenseReportDetailDto[]>(`${this.apiUrl}/reports/my`);
  }

  getAllReports(): Observable<ExpenseReportDetailDto[]> {
    return this.http.get<ExpenseReportDetailDto[]>(`${this.apiUrl}/reports/all`);
  }

  getReportById(id: number): Observable<ExpenseReportDetailDto> {
    return this.http.get<ExpenseReportDetailDto>(`${this.apiUrl}/reports/${id}`);
  }

  createReport(request: CreateExpenseReportRequest): Observable<ExpenseReportDetailDto> {
    return this.http.post<ExpenseReportDetailDto>(`${this.apiUrl}/reports`, request);
  }

  updateReport(id: number, request: CreateExpenseReportRequest): Observable<ExpenseReportDetailDto> {
    return this.http.put<ExpenseReportDetailDto>(`${this.apiUrl}/reports/${id}`, request);
  }

  deleteReport(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/reports/${id}`);
  }

  submitReport(id: number): Observable<ExpenseReportDetailDto> {
    return this.http.post<ExpenseReportDetailDto>(`${this.apiUrl}/reports/${id}/submit`, {});
  }

  addReportItem(reportId: number, item: CreateExpenseItemRequest): Observable<ExpenseItemDto> {
    return this.http.post<ExpenseItemDto>(`${this.apiUrl}/reports/${reportId}/items`, item);
  }

  deleteReportItem(reportId: number, itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/reports/${reportId}/items/${itemId}`);
  }

  addMileageItem(reportId: number, mileage: CreateExpenseMileageRequest): Observable<ExpenseMileageDto> {
    return this.http.post<ExpenseMileageDto>(`${this.apiUrl}/reports/${reportId}/mileage`, mileage);
  }

  // Approvals
  processApproval(request: ApproveExpenseRequest): Observable<ExpenseReportDetailDto> {
    return this.http.post<ExpenseReportDetailDto>(`${this.apiUrl}/approvals`, request);
  }

  // Disbursement
  disburseExpense(request: DisburseExpenseRequest): Observable<ExpenseReportDetailDto> {
    return this.http.post<ExpenseReportDetailDto>(`${this.apiUrl}/disburse`, request);
  }

  // Advances
  getMyAdvances(): Observable<ExpenseAdvanceDto[]> {
    return this.http.get<ExpenseAdvanceDto[]>(`${this.apiUrl}/advances/my`);
  }

  getAllAdvances(): Observable<ExpenseAdvanceDto[]> {
    return this.http.get<ExpenseAdvanceDto[]>(`${this.apiUrl}/advances/all`);
  }

  requestAdvance(request: RequestAdvanceDto): Observable<ExpenseAdvanceDto> {
    return this.http.post<ExpenseAdvanceDto>(`${this.apiUrl}/advances`, request);
  }

  approveAdvance(id: number, isApproved: boolean, remarks?: string): Observable<ExpenseAdvanceDto> {
    return this.http.post<ExpenseAdvanceDto>(`${this.apiUrl}/advances/${id}/approve`, { isApproved, remarks });
  }

  disburseAdvance(id: number, disbursedAmount: number, remarks?: string): Observable<ExpenseAdvanceDto> {
    return this.http.post<ExpenseAdvanceDto>(`${this.apiUrl}/advances/${id}/disburse`, { disbursedAmount, remarks });
  }
}
