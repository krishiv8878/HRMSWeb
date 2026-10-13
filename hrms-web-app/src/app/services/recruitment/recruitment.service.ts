import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface JobRequisitionDto {
  id: number;
  title: string;
  jobCode: string;
  department: string;
  location: string;
  employmentType: string;
  experienceMin: number;
  experienceMax: number;
  budgetMin: number;
  budgetMax: number;
  openPositions: number;
  filledPositions: number;
  description: string;
  requirements: string;
  hiringManagerId?: number;
  hiringManagerName?: string;
  recruiterId?: number;
  recruiterName?: string;
  status: 'Draft' | 'Open' | 'On Hold' | 'Closed';
  targetCloseDate?: string;
  createdAt: string;

  totalApplicants: number;
  sourcedCount: number;
  screeningCount: number;
  interviewCount: number;
  offeredCount: number;
  hiredCount: number;
  rejectedCount: number;
}

export interface CreateJobRequisitionRequest {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  experienceMin: number;
  experienceMax: number;
  budgetMin: number;
  budgetMax: number;
  openPositions: number;
  description: string;
  requirements: string;
  hiringManagerId?: number;
  recruiterId?: number;
  targetCloseDate?: string;
}

export interface CandidatePipelineItemDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  emailAddress: string;
  mobileNumber: string;
  totalExperience: string;
  relevantExperience: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: number;
  appliedRole: string;
  stage: string; // Sourced, Screening, Interview, Offered, Hired, Rejected
  matchScore?: number;
  jobRequisitionId?: number;
  jobRequisitionTitle?: string;
  jobCode?: string;
  resumeUrl?: string;
  source?: string;
  createdAt: string;

  interviews: JobInterviewDto[];
  latestOffer?: JobOfferDto;
}

export interface UpdateCandidateStageRequest {
  candidateId: number;
  newStage: string;
  notes?: string;
}

export interface JobInterviewDto {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidateRole: string;
  jobRequisitionId?: number;
  jobTitle?: string;
  roundName: string;
  interviewerId: number;
  interviewerName: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  rating?: number;
  recommendation?: 'Strong Hire' | 'Hire' | 'Borderline' | 'Reject';
  feedbackNotes?: string;
  evaluatedAt?: string;
}

export interface ScheduleInterviewRequest {
  candidateId: number;
  jobRequisitionId?: number;
  roundName: string;
  interviewerId: number;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
}

export interface SubmitInterviewFeedbackRequest {
  interviewId: number;
  rating: number;
  recommendation: string;
  feedbackNotes: string;
  advanceToNextStage: boolean;
}

export interface JobOfferDto {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  jobRequisitionId?: number;
  jobTitle?: string;
  designation: string;
  offeredCtc: number;
  joiningDate: string;
  expiryDate?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Revoked' | 'Onboarded';
  notes?: string;
  approvedBy?: string;
  issuedDate?: string;
  isCandidateOnboarded?: boolean;
}

export interface CreateJobOfferRequest {
  candidateId: number;
  jobRequisitionId?: number;
  designation: string;
  offeredCtc: number;
  joiningDate: string;
  expiryDate?: string;
  notes?: string;
}

export interface RecruitmentDashboardMetricsDto {
  openRequisitionsCount: number;
  totalCandidatesInPipeline: number;
  activeInterviewsScheduled: number;
  offersReleasedCount: number;
  offersAcceptedCount: number;
  hiredThisQuarterCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.host}/Recruitment`;

  // Requisitions
  getAllRequisitions(status?: string): Observable<JobRequisitionDto[]> {
    const url = status && status !== 'All' ? `${this.apiUrl}/requisitions?status=${encodeURIComponent(status)}` : `${this.apiUrl}/requisitions`;
    return this.http.get<JobRequisitionDto[]>(url);
  }

  getRequisitionById(id: number): Observable<JobRequisitionDto> {
    return this.http.get<JobRequisitionDto>(`${this.apiUrl}/requisitions/${id}`);
  }

  createRequisition(request: CreateJobRequisitionRequest): Observable<JobRequisitionDto> {
    return this.http.post<JobRequisitionDto>(`${this.apiUrl}/requisitions`, request);
  }

  updateRequisition(id: number, request: CreateJobRequisitionRequest): Observable<JobRequisitionDto> {
    return this.http.put<JobRequisitionDto>(`${this.apiUrl}/requisitions/${id}`, request);
  }

  updateRequisitionStatus(id: number, newStage: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.apiUrl}/requisitions/${id}/status`, { candidateId: id, newStage });
  }

  deleteRequisition(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/requisitions/${id}`);
  }

  // Pipeline Candidates
  getPipeline(requisitionId?: number, stage?: string): Observable<CandidatePipelineItemDto[]> {
    const params: string[] = [];
    if (requisitionId) params.push(`requisitionId=${requisitionId}`);
    if (stage && stage !== 'All') params.push(`stage=${encodeURIComponent(stage)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<CandidatePipelineItemDto[]>(`${this.apiUrl}/pipeline${query}`);
  }

  getCandidateDetail(candidateId: number): Observable<CandidatePipelineItemDto> {
    return this.http.get<CandidatePipelineItemDto>(`${this.apiUrl}/pipeline/${candidateId}`);
  }

  updateCandidateStage(candidateId: number, newStage: string, notes?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/pipeline/stage`, { candidateId, newStage, notes });
  }

  // Interviews
  getInterviews(candidateId?: number, interviewerId?: number, status?: string): Observable<JobInterviewDto[]> {
    const params: string[] = [];
    if (candidateId) params.push(`candidateId=${candidateId}`);
    if (interviewerId) params.push(`interviewerId=${interviewerId}`);
    if (status && status !== 'All') params.push(`status=${encodeURIComponent(status)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<JobInterviewDto[]>(`${this.apiUrl}/interviews${query}`);
  }

  scheduleInterview(request: ScheduleInterviewRequest): Observable<JobInterviewDto> {
    return this.http.post<JobInterviewDto>(`${this.apiUrl}/interviews/schedule`, request);
  }

  submitInterviewFeedback(request: SubmitInterviewFeedbackRequest): Observable<JobInterviewDto> {
    return this.http.post<JobInterviewDto>(`${this.apiUrl}/interviews/feedback`, request);
  }

  cancelInterview(id: number, notes?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/interviews/${id}/cancel`, { candidateId: id, newStage: '', notes });
  }

  // Offers
  getOffers(requisitionId?: number, status?: string): Observable<JobOfferDto[]> {
    const params: string[] = [];
    if (requisitionId) params.push(`requisitionId=${requisitionId}`);
    if (status && status !== 'All') params.push(`status=${encodeURIComponent(status)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<JobOfferDto[]>(`${this.apiUrl}/offers${query}`);
  }

  createOffer(request: CreateJobOfferRequest): Observable<JobOfferDto> {
    return this.http.post<JobOfferDto>(`${this.apiUrl}/offers`, request);
  }

  updateOfferStatus(offerId: number, newStage: string, notes?: string): Observable<JobOfferDto> {
    return this.http.put<JobOfferDto>(`${this.apiUrl}/offers/${offerId}/status`, { candidateId: offerId, newStage, notes });
  }

  // Dashboard Metrics
  getMetrics(): Observable<RecruitmentDashboardMetricsDto> {
    return this.http.get<RecruitmentDashboardMetricsDto>(`${this.apiUrl}/metrics`);
  }
}
