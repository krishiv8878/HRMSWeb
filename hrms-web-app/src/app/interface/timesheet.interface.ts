export interface TimesheetTaskItem {
  id: number;
  projectId: number;
  projectName: string;
  entryDate: string;
  taskDescription: string;
  hours: number;
}

export interface TimesheetDayView {
  date: string;
  dayName?: string;
  dayOfWeek?: string;
  clockIn?: string | null;
  clockOut?: string | null;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  attendanceHours: number;
  isRegularized: boolean;
  isShiftInProgress: boolean;
  tasks: TimesheetTaskItem[];
  totalDayTaskHours?: number;
  dayTotalHours?: number;
}

export interface TimesheetView {
  timesheetId?: number | null;
  id?: number | null;
  employeeId: number;
  employeeName: string;
  periodType: 'Weekly' | 'Monthly';
  startDate: string;
  endDate: string;
  totalTimesheetHours: number;
  totalAttendanceHours: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedDate?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  rejectionReason?: string | null;
  days: TimesheetDayView[];
}

export interface TimesheetEntryPayload {
  id: number;
  projectId: number;
  entryDate: string;
  taskDescription: string;
  hours: number;
}

export interface TimesheetSubmitPayload {
  periodType: 'Weekly' | 'Monthly';
  startDate: string;
  endDate: string;
  estimatedActiveShiftHours?: number;
}

export interface TimesheetApprovalPayload {
  timesheetId: number;
  status: 'Approved' | 'Rejected';
  rejectionReason?: string;
}
