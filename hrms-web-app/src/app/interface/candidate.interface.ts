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
  currentSalary?: string | number;
  currentExperience?: string | number;
  expectedSalary?: string | number;
  expectedExperience?: string | number;
  appliedRole?: string;
  stage?: 'Sourced' | 'Screening' | 'Technical Interview' | 'HR Screen' | 'Interview' | 'Offer Extended' | 'Offer' | 'Rejected' | string;
  matchScore?: number;
  lastUpdated?: string;
  noticePeriod?: string | number;
  isActive?: boolean;
  isDeleted?: boolean;
  avatarUrl?: string;
  initials?: string;
  selected?: boolean;
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
