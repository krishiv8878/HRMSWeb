import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PmsKeyResult {
  id?: number;
  goalId?: number;
  title: string;
  targetValue: number;
  currentValue: number;
  metricUnit: string;
  weightage: number;
  confidenceScore?: number;
}

export interface PmsGoalCheckIn {
  id?: number;
  goalId: number;
  keyResultId?: number;
  checkInDate: string;
  previousValue: number;
  newValue: number;
  confidenceScore: number;
  notes: string;
  checkInBy: number;
}

export interface PmsGoal {
  id: number;
  employeeId: number;
  title: string;
  description: string;
  category: 'Individual' | 'Department' | 'Company';
  department?: string;
  period: string;
  weightage: number;
  progressPercentage: number;
  confidenceScore: number;
  status: 'Not Started' | 'On Track' | 'At Risk' | 'Behind' | 'Completed';
  startDate?: string;
  dueDate?: string;
  isApproved: boolean;
  isPrivate: boolean;
  createdDate?: string;
}

export interface PmsGoalDto {
  goal: PmsGoal;
  keyResults: PmsKeyResult[];
  checkIns: PmsGoalCheckIn[];
  employeeName: string;
  employeeCode: string;
  designation: string;
}

export interface PmsReviewCycle {
  id: number;
  cycleName: string;
  description: string;
  period: string;
  startDate: string;
  endDate: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  status: 'Upcoming' | 'SelfReview' | 'ManagerReview' | 'FinalReview' | 'Closed';
  createdDate?: string;
}

export interface PmsAppraisal {
  id: number;
  reviewCycleId: number;
  employeeId: number;
  managerId: number;
  status: 'Pending Self Review' | 'Pending Manager Review' | 'Pending HR Review' | 'Finalized' | 'Completed';
  selfRating?: number;
  selfComments?: string;
  selfSubmittedAt?: string;
  managerRating?: number;
  managerComments?: string;
  managerSubmittedAt?: string;
  finalRating?: number;
  hrComments?: string;
  finalizedAt?: string;
  goalScore?: number;
  competencyScore?: number;
  competencyRatingsJson?: string;
}

export interface PmsAppraisalDto {
  appraisal: PmsAppraisal;
  cycle?: PmsReviewCycle;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  managerName: string;
}

export interface PmsFeedback {
  id: number;
  fromEmployeeId: number;
  toEmployeeId: number;
  feedbackType: 'Praise' | 'Constructive' | 'PeerReview' | 'CheckIn';
  badge: string;
  message: string;
  isPrivate: boolean;
  reviewCycleId?: number;
  createdDate?: string;
}

export interface PmsFeedbackDto {
  feedback: PmsFeedback;
  fromEmployeeName: string;
  fromEmployeeDesignation: string;
  toEmployeeName: string;
  toEmployeeDesignation: string;
}

export interface PmsOneOnOne {
  id: number;
  managerId: number;
  employeeId: number;
  scheduledDate: string;
  completedDate?: string;
  agenda: string;
  talkingPointsJson?: string;
  actionItemsJson?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface PmsOneOnOneDto {
  oneOnOne: PmsOneOnOne;
  managerName: string;
  employeeName: string;
  employeeDesignation: string;
}

export interface PmsPip {
  id: number;
  employeeId: number;
  managerId: number;
  hrId: number;
  reason: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  objectivesJson?: string;
  checkInFrequency: string;
  outcome: 'Active' | 'Passed' | 'Extended' | 'Failed';
  finalComments?: string;
  status: string;
}

export interface PmsPipDto {
  pip: PmsPip;
  employeeName: string;
  employeeCode: string;
  department: string;
  managerName: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class PmsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Pms`;

  // 1. Goals & OKRs
  getGoals(employeeId?: number, period?: string, category?: string): Observable<ApiResponse<PmsGoalDto[]>> {
    let params: string[] = [];
    if (employeeId) params.push(`employeeId=${employeeId}`);
    if (period) params.push(`period=${encodeURIComponent(period)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<ApiResponse<PmsGoalDto[]>>(`${this.apiUrl}/goals${q}`);
  }

  getGoalById(id: number): Observable<ApiResponse<PmsGoalDto>> {
    return this.http.get<ApiResponse<PmsGoalDto>>(`${this.apiUrl}/goals/${id}`);
  }

  createGoal(req: any): Observable<ApiResponse<PmsGoalDto>> {
    return this.http.post<ApiResponse<PmsGoalDto>>(`${this.apiUrl}/goals`, req);
  }

  updateGoal(id: number, req: any): Observable<ApiResponse<PmsGoalDto>> {
    return this.http.put<ApiResponse<PmsGoalDto>>(`${this.apiUrl}/goals/${id}`, req);
  }

  deleteGoal(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/goals/${id}`);
  }

  recordCheckIn(goalId: number, req: any): Observable<ApiResponse<PmsGoalDto>> {
    return this.http.post<ApiResponse<PmsGoalDto>>(`${this.apiUrl}/goals/${goalId}/checkin`, req);
  }

  // 2. Review Cycles & Appraisals
  getReviewCycles(): Observable<ApiResponse<PmsReviewCycle[]>> {
    return this.http.get<ApiResponse<PmsReviewCycle[]>>(`${this.apiUrl}/cycles`);
  }

  createReviewCycle(req: any): Observable<ApiResponse<PmsReviewCycle>> {
    return this.http.post<ApiResponse<PmsReviewCycle>>(`${this.apiUrl}/cycles`, req);
  }

  getAppraisals(cycleId?: number, employeeId?: number, managerId?: number): Observable<ApiResponse<PmsAppraisalDto[]>> {
    let params: string[] = [];
    if (cycleId) params.push(`cycleId=${cycleId}`);
    if (employeeId) params.push(`employeeId=${employeeId}`);
    if (managerId) params.push(`managerId=${managerId}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<ApiResponse<PmsAppraisalDto[]>>(`${this.apiUrl}/appraisals${q}`);
  }

  getAppraisalById(id: number): Observable<ApiResponse<PmsAppraisalDto>> {
    return this.http.get<ApiResponse<PmsAppraisalDto>>(`${this.apiUrl}/appraisals/${id}`);
  }

  submitSelfReview(req: any): Observable<ApiResponse<PmsAppraisalDto>> {
    return this.http.post<ApiResponse<PmsAppraisalDto>>(`${this.apiUrl}/appraisals/submit-self`, req);
  }

  submitManagerReview(req: any): Observable<ApiResponse<PmsAppraisalDto>> {
    return this.http.post<ApiResponse<PmsAppraisalDto>>(`${this.apiUrl}/appraisals/submit-manager`, req);
  }

  finalizeAppraisal(req: any): Observable<ApiResponse<PmsAppraisalDto>> {
    return this.http.post<ApiResponse<PmsAppraisalDto>>(`${this.apiUrl}/appraisals/finalize`, req);
  }

  // 3. Continuous Feedback
  getFeedback(employeeId?: number, feedbackType?: string): Observable<ApiResponse<PmsFeedbackDto[]>> {
    let params: string[] = [];
    if (employeeId) params.push(`employeeId=${employeeId}`);
    if (feedbackType) params.push(`feedbackType=${encodeURIComponent(feedbackType)}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<ApiResponse<PmsFeedbackDto[]>>(`${this.apiUrl}/feedback${q}`);
  }

  giveFeedback(req: any): Observable<ApiResponse<PmsFeedbackDto>> {
    return this.http.post<ApiResponse<PmsFeedbackDto>>(`${this.apiUrl}/feedback`, req);
  }

  // 4. 1-on-1 Meetings
  getOneOnOnes(managerId?: number, employeeId?: number): Observable<ApiResponse<PmsOneOnOneDto[]>> {
    let params: string[] = [];
    if (managerId) params.push(`managerId=${managerId}`);
    if (employeeId) params.push(`employeeId=${employeeId}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<ApiResponse<PmsOneOnOneDto[]>>(`${this.apiUrl}/one-on-one${q}`);
  }

  saveOneOnOne(req: any): Observable<ApiResponse<PmsOneOnOneDto>> {
    return this.http.post<ApiResponse<PmsOneOnOneDto>>(`${this.apiUrl}/one-on-one`, req);
  }

  // 5. Performance Improvement Plans (PIP)
  getPips(employeeId?: number): Observable<ApiResponse<PmsPipDto[]>> {
    let q = employeeId ? `?employeeId=${employeeId}` : '';
    return this.http.get<ApiResponse<PmsPipDto[]>>(`${this.apiUrl}/pip${q}`);
  }

  savePip(req: any): Observable<ApiResponse<PmsPipDto>> {
    return this.http.post<ApiResponse<PmsPipDto>>(`${this.apiUrl}/pip`, req);
  }
}
