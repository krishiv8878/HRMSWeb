export interface CandidateItem {
  id: number;
  candidateId?: number;
  firstName: string;
  lastName: string;
  fullName?: string;
  emailAddress: string;
  mobileNumber: string;
  totalExperience: string | number;
  relevantExperience: string | number;
  rawRelevantExperience?: string;
  currentSalary?: string | number;
  currentExperience?: string | number;
  expectedSalary?: string | number;
  expectedExperience?: string | number;
  rawCurrentSalary?: number;
  rawExpectedSalary?: number;
  appliedRole?: string;
  stage?: 'Sourced' | 'Screening' | 'Technical Interview' | 'HR Screen' | 'Interview' | 'Offer Extended' | 'Offer Accepted' | 'Selected / Hired' | 'Offer' | 'Rejected' | string;
  matchScore?: number;
  lastUpdated?: string;
  noticePeriod?: string | number;
  isActive?: boolean;
  isDeleted?: boolean;
  avatarUrl?: string;
  initials?: string;
  selected?: boolean;
  interviewerId?: number;
  interviewerName?: string;
  interviewerRemarks?: string;
  interviewRating?: number;
  interviewRecommendation?: string;
  currentRound?: string;
  interviewStatus?: 'Not Scheduled' | 'Scheduled' | 'Feedback Submitted' | 'Passed' | 'Rejected' | string;
  interviewHistory?: any[];
  isOnboarded?: boolean;
}

export interface TalentMetrics {
  openRolesActive: number;
  timeToFillAvgDays: number;
  timeToFillProgressPercent?: number;
  offerAcceptancePercent: number;
  quarterlyGrowthRate?: string;
  quarterlyGrowthPositive?: boolean;
  sourcedCount: number;
  screeningCount: number;
  interviewCount: number;
  offerCount: number;
}
