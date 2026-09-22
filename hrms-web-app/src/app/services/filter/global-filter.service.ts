import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PageFilterConfig {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showEmployeeFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: string[];
  showMonthFilter?: boolean;
  availableMonths?: string[];
  showCategoryFilter?: boolean;
  categoryOptions?: string[];
}

export interface ActiveFilterState {
  search: string;
  employeeId: number | 'All';
  employeeName?: string;
  status: string;
  month: string;
  category: string;
  dateStart: string | null;
  dateEnd: string | null;
}

export const ROUTE_FILTER_MAP: Record<string, PageFilterConfig> = {
  '/index/attendance': {
    pageId: 'attendance',
    pageTitle: 'Attendance & Time Logs',
    pageIcon: 'fingerprint',
    showSearch: true,
    searchPlaceholder: 'Search attendance by date or status...',
    showStatusFilter: true,
    statusOptions: ['All', 'Present', 'Absent', 'On Leave', 'Week Off', 'Holiday'],
    showMonthFilter: true,
    showEmployeeFilter: true
  },
  '/index/leaveRequest': {
    pageId: 'leaveRequest',
    pageTitle: 'Leave Requests',
    pageIcon: 'beach_access',
    showSearch: true,
    searchPlaceholder: 'Search leaves by reason or employee...',
    showStatusFilter: true,
    statusOptions: ['All', 'Pending', 'Approved', 'Rejected'],
    showEmployeeFilter: true
  },
  '/index/request': {
    pageId: 'requests',
    pageTitle: 'Requests & Approvals',
    pageIcon: 'assignment_turned_in',
    showSearch: true,
    searchPlaceholder: 'Search requester or ticket details...',
    showStatusFilter: true,
    statusOptions: ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
    showEmployeeFilter: true
  },
  '/index/paymentinfo': {
    pageId: 'payroll',
    pageTitle: 'Payroll & Compensation',
    pageIcon: 'payments',
    showSearch: true,
    searchPlaceholder: 'Search employee, department or account...',
    showStatusFilter: true,
    statusOptions: ['All', 'Credited', 'Pending', 'NoBank'],
    showMonthFilter: true,
    showEmployeeFilter: true
  },
  '/index/timesheet': {
    pageId: 'timesheet',
    pageTitle: 'Timesheets',
    pageIcon: 'more_time',
    showSearch: true,
    searchPlaceholder: 'Search tasks, projects or notes...',
    showStatusFilter: true,
    statusOptions: ['All', 'Draft', 'Submitted', 'Approved', 'Rejected'],
    showEmployeeFilter: true
  },
  '/index/home': {
    pageId: 'home',
    pageTitle: 'Personnel Directory',
    pageIcon: 'badge',
    showSearch: true,
    searchPlaceholder: 'Search employee name, email, role...',
    showStatusFilter: true,
    statusOptions: ['All', 'Active', 'Inactive']
  },
  '/index/assets': {
    pageId: 'assets',
    pageTitle: 'Hardware Assets',
    pageIcon: 'inventory_2',
    showSearch: true,
    searchPlaceholder: 'Search asset model, serial, employee...',
    showStatusFilter: true,
    statusOptions: ['All', 'In Stock / Available', 'Allocated / Deployed', 'Under Maintenance', 'Scrapped'],
    showEmployeeFilter: true
  },
  '/index/candidate': {
    pageId: 'candidate',
    pageTitle: 'Candidate Pipeline',
    pageIcon: 'group_add',
    showSearch: true,
    searchPlaceholder: 'Search candidate name, email, skills...',
    showStatusFilter: true,
    statusOptions: ['All', 'Applied', 'Screening', 'Interview Scheduled', 'Offered', 'Hired', 'Rejected']
  },
  '/index/project': {
    pageId: 'project',
    pageTitle: 'Project Portfolio',
    pageIcon: 'work',
    showSearch: true,
    searchPlaceholder: 'Search project name, client, code...',
    showStatusFilter: true,
    statusOptions: ['All', 'Active', 'Completed', 'On Hold', 'Planning']
  },
  '/index/shift': {
    pageId: 'shift',
    pageTitle: 'Shift Management',
    pageIcon: 'schedule',
    showSearch: true,
    searchPlaceholder: 'Search employee or shift assignment...',
    showEmployeeFilter: true
  },
  '/index/holiday': {
    pageId: 'holiday',
    pageTitle: 'Holiday Calendar',
    pageIcon: 'event_available',
    showSearch: true,
    searchPlaceholder: 'Search holiday name or date...'
  },
  '/index/document': {
    pageId: 'document',
    pageTitle: 'Document Repository',
    pageIcon: 'folder_shared',
    showSearch: true,
    searchPlaceholder: 'Search document title or employee...',
    showEmployeeFilter: true
  }
};

const INITIAL_STATE: ActiveFilterState = {
  search: '',
  employeeId: 'All',
  employeeName: 'All Employees',
  status: 'All',
  month: 'All',
  category: 'All',
  dateStart: null,
  dateEnd: null
};

@Injectable({
  providedIn: 'root'
})
export class GlobalFilterService {
  private filtersSubject = new BehaviorSubject<ActiveFilterState>({ ...INITIAL_STATE });
  public filters$: Observable<ActiveFilterState> = this.filtersSubject.asObservable();

  private pageConfigSubject = new BehaviorSubject<PageFilterConfig | null>(null);
  public pageConfig$: Observable<PageFilterConfig | null> = this.pageConfigSubject.asObservable();

  private isFilterBarOpenSubject = new BehaviorSubject<boolean>(true);
  public isFilterBarOpen$: Observable<boolean> = this.isFilterBarOpenSubject.asObservable();

  constructor() {}

  get currentFilters(): ActiveFilterState {
    return this.filtersSubject.getValue();
  }

  get currentPageConfig(): PageFilterConfig | null {
    return this.pageConfigSubject.getValue();
  }

  get isFilterBarOpen(): boolean {
    return this.isFilterBarOpenSubject.getValue();
  }

  toggleFilterBar(): void {
    this.isFilterBarOpenSubject.next(!this.isFilterBarOpen);
  }

  setFilterBarOpen(isOpen: boolean): void {
    this.isFilterBarOpenSubject.next(isOpen);
  }

  setSearch(search: string): void {
    this.updateFilters({ search: (search || '').trim() });
  }

  setEmployee(employeeId: number | 'All', employeeName: string = 'All Employees'): void {
    this.updateFilters({ employeeId, employeeName });
  }

  setStatus(status: string): void {
    this.updateFilters({ status: status || 'All' });
  }

  setMonth(month: string): void {
    this.updateFilters({ month: month || 'All' });
  }

  setCategory(category: string): void {
    this.updateFilters({ category: category || 'All' });
  }

  setDateRange(start: string | null, end: string | null): void {
    this.updateFilters({ dateStart: start, dateEnd: end });
  }

  resetAllFilters(): void {
    this.filtersSubject.next({ ...INITIAL_STATE });
  }

  resetFilter(key: keyof ActiveFilterState): void {
    const current = this.currentFilters;
    switch (key) {
      case 'search':
        this.updateFilters({ search: '' });
        break;
      case 'employeeId':
        this.updateFilters({ employeeId: 'All', employeeName: 'All Employees' });
        break;
      case 'status':
        this.updateFilters({ status: 'All' });
        break;
      case 'month':
        this.updateFilters({ month: 'All' });
        break;
      case 'category':
        this.updateFilters({ category: 'All' });
        break;
      case 'dateStart':
      case 'dateEnd':
        this.updateFilters({ dateStart: null, dateEnd: null });
        break;
    }
  }

  setPageConfig(config: PageFilterConfig | null): void {
    this.pageConfigSubject.next(config);
  }

  updateRouteContext(url: string): void {
    const cleanUrl = url.split('?')[0];
    const matchedKey = Object.keys(ROUTE_FILTER_MAP).find(route => cleanUrl.startsWith(route));

    if (matchedKey) {
      const config = ROUTE_FILTER_MAP[matchedKey];
      this.setPageConfig(config);
      // Retain search if user was searching, but reset page-specific status if it doesn't apply
      const current = this.currentFilters;
      if (config.statusOptions && !config.statusOptions.includes(current.status)) {
        this.updateFilters({ status: 'All' });
      }
    } else {
      this.setPageConfig(null);
    }
  }

  getActiveFiltersCount(): number {
    const f = this.currentFilters;
    let count = 0;
    if (f.search) count++;
    if (f.employeeId !== 'All') count++;
    if (f.status && f.status !== 'All') count++;
    if (f.month && f.month !== 'All') count++;
    if (f.category && f.category !== 'All') count++;
    if (f.dateStart || f.dateEnd) count++;
    return count;
  }

  private updateFilters(partial: Partial<ActiveFilterState>): void {
    this.filtersSubject.next({
      ...this.currentFilters,
      ...partial
    });
  }
}
