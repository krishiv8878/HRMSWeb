import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface PolicyDto {
  id: number;
  title: string;
  category: string;
  version: number;
  contentHtml: string;
  attachmentUrl?: string;
  isActive: boolean;
  requiresAcknowledgement: boolean;
  effectiveDate: string;
  expiryDate?: string;
  createdDate: string;
  updatedDate?: string;
  isAcknowledgedByCurrentUser: boolean;
  currentUserAcknowledgedAt?: string;
  totalAcksCount: number;
}

export interface PolicyAcknowledgement {
  id: number;
  policyId: number;
  policyVersion: number;
  employeeId: number;
  employeeName?: string;
  acknowledgedAt: string;
  ipAddress?: string;
}

export interface PolicyComplianceSummaryDto {
  totalPolicies: number;
  activePolicies: number;
  mandatoryAcknowledgementPolicies: number;
  overallComplianceRatePercent: number;
  totalRequiredAcknowledgements: number;
  totalRecordedAcknowledgements: number;
}

export interface CreateCompanyPolicyPayload {
  title: string;
  category: string;
  contentHtml: string;
  attachmentUrl?: string;
  requiresAcknowledgement: boolean;
  effectiveDate: string;
  expiryDate?: string;
}

export interface UpdateCompanyPolicyPayload extends CreateCompanyPolicyPayload {
  id: number;
  isActive: boolean;
  bumpVersion?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyPolicyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/CompanyPolicy`;

  getAll(category?: string, activeOnly: boolean = true): Observable<any> {
    let params = new HttpParams().set('activeOnly', activeOnly.toString());
    if (category && category !== 'All') {
      params = params.set('category', category);
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateCompanyPolicyPayload): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  update(payload: UpdateCompanyPolicyPayload): Observable<any> {
    return this.http.put<any>(this.apiUrl, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  acknowledge(policyId: number, policyVersion: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/acknowledge`, { policyId, policyVersion });
  }

  getAcknowledgements(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/acknowledgements`);
  }

  getComplianceSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/compliance-summary`);
  }
}
