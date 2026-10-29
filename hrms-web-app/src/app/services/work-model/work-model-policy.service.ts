import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

export type WorkModelType = 'WFO' | 'WFH' | 'OD'; // Office, Work From Home, On-Duty
export type WorkModelPolicyMode = 'DIRECT_SELECT' | 'REQUIRE_APPROVAL' | 'HYBRID_QUOTA';

export interface WorkModelPolicyConfig {
  id: string;
  name: string;
  policyMode: WorkModelPolicyMode; // 'DIRECT_SELECT' | 'REQUIRE_APPROVAL' | 'HYBRID_QUOTA'
  hybridWeeklyWfoDays: number; // e.g. 2 days WFO
  hybridWeeklyWfhDays: number; // e.g. 3 days WFH
  schedulePreset: {
    monday: WorkModelType;
    tuesday: WorkModelType;
    wednesday: WorkModelType;
    thursday: WorkModelType;
    friday: WorkModelType;
    saturday: 'WO' | WorkModelType;
    sunday: 'WO';
  };
  allowEmployeeDirectSelection: boolean;
  maxMonthlyWfhDays: number;
  noticeRequiredDays: number;
}

export interface EmployeeDailyWorkModel {
  id?: number;
  employeeId: number;
  employeeName?: string;
  dateStr: string; // YYYY-MM-DD
  workModel: WorkModelType;
  isApproved: boolean;
  selectedBy: 'Employee' | 'Manager' | 'Admin' | 'Policy' | string;
  notes?: string;
}

interface ApiResponse<T> {
  statusCode: number;
  message?: string;
  data: T;
}

interface WorkModeBackendDTO {
  id: number;
  employeeId: number;
  employeeName?: string;
  workDate: string;
  workMode: string;
  selectedBy: string;
  notes?: string;
  createdDate?: string;
  updatedDate?: string;
}

const STORAGE_WORK_MODEL_POLICY_KEY = 'hrms_work_model_policy_config';
const STORAGE_DAILY_WORK_MODELS_KEY = 'hrms_employee_daily_work_models';

@Injectable({
  providedIn: 'root'
})
export class WorkModelPolicyService {
  private http = inject(HttpClient);
  private toaster = inject(ToastrService);
  private apiUrl = `${environment.host}/WorkMode`;

  private defaultPolicy: WorkModelPolicyConfig = {
    id: 'default_hybrid_2wfo_3wfh',
    name: 'Corporate Hybrid Policy (2 Days WFO / 3 Days WFH)',
    policyMode: 'HYBRID_QUOTA',
    hybridWeeklyWfoDays: 2,
    hybridWeeklyWfhDays: 3,
    schedulePreset: {
      monday: 'WFH',
      tuesday: 'WFO',
      wednesday: 'WFH',
      thursday: 'WFO',
      friday: 'WFH',
      saturday: 'WO',
      sunday: 'WO'
    },
    allowEmployeeDirectSelection: true,
    maxMonthlyWfhDays: 12,
    noticeRequiredDays: 0
  };

  private currentPolicySubject = new BehaviorSubject<WorkModelPolicyConfig>(this.defaultPolicy);
  public currentPolicy$: Observable<WorkModelPolicyConfig> = this.currentPolicySubject.asObservable();

  private dailyModelsMap: Map<string, EmployeeDailyWorkModel> = new Map(); // Key: `${empId}_${dateStr}`
  private dailyModelsSubject = new BehaviorSubject<Map<string, EmployeeDailyWorkModel>>(this.dailyModelsMap);
  public dailyModels$: Observable<Map<string, EmployeeDailyWorkModel>> = this.dailyModelsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const rawPolicy = localStorage.getItem(STORAGE_WORK_MODEL_POLICY_KEY);
      if (rawPolicy) {
        this.currentPolicySubject.next(JSON.parse(rawPolicy));
      } else {
        localStorage.setItem(STORAGE_WORK_MODEL_POLICY_KEY, JSON.stringify(this.defaultPolicy));
      }

      const rawModels = localStorage.getItem(STORAGE_DAILY_WORK_MODELS_KEY);
      if (rawModels) {
        const parsed: EmployeeDailyWorkModel[] = JSON.parse(rawModels);
        parsed.forEach(m => {
          this.dailyModelsMap.set(`${m.employeeId}_${m.dateStr}`, m);
        });
        this.dailyModelsSubject.next(this.dailyModelsMap);
      }
    } catch (e) {
      console.warn('Failed to load work model policies from storage', e);
    }
  }

  private persistStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(STORAGE_WORK_MODEL_POLICY_KEY, JSON.stringify(this.currentPolicySubject.value));
      const arrayModels = Array.from(this.dailyModelsMap.values());
      localStorage.setItem(STORAGE_DAILY_WORK_MODELS_KEY, JSON.stringify(arrayModels));
    } catch (e) {
      console.warn('Failed to save work model policies to storage', e);
    }
  }

  public getPolicy(): WorkModelPolicyConfig {
    return this.currentPolicySubject.value;
  }

  public updatePolicy(policy: WorkModelPolicyConfig): void {
    this.currentPolicySubject.next({ ...policy });
    this.persistStorage();
    this.toaster.success('Work model & hybrid policy configuration saved successfully.', 'Policy Updated');
  }

  public canEmployeeDirectSelect(): boolean {
    const policy = this.getPolicy();
    return policy.policyMode === 'DIRECT_SELECT' || policy.allowEmployeeDirectSelection;
  }

  public getWorkModelForDate(employeeId: number, dateStr: string): WorkModelType {
    const key = `${employeeId}_${dateStr}`;
    const entry = this.dailyModelsMap.get(key);
    if (entry) {
      return entry.workModel;
    }

    // Fallback to schedule preset for day of week
    const policy = this.getPolicy();
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    switch (day) {
      case 1: return policy.schedulePreset.monday;
      case 2: return policy.schedulePreset.tuesday;
      case 3: return policy.schedulePreset.wednesday;
      case 4: return policy.schedulePreset.thursday;
      case 5: return policy.schedulePreset.friday;
      default: return 'WFO';
    }
  }

  public getWorkModelDetails(employeeId: number, dateStr: string): EmployeeDailyWorkModel | undefined {
    const key = `${employeeId}_${dateStr}`;
    return this.dailyModelsMap.get(key);
  }

  public setWorkModelForDate(
    employeeId: number,
    dateStr: string,
    model: WorkModelType,
    selectedBy: 'Employee' | 'Manager' | 'Admin' | 'Policy' | string = 'Employee',
    notes?: string
  ): Observable<any> {
    const key = `${employeeId}_${dateStr}`;
    const policy = this.getPolicy();
    const isApproved = policy.policyMode !== 'REQUIRE_APPROVAL';

    const item: EmployeeDailyWorkModel = {
      employeeId,
      dateStr,
      workModel: model,
      isApproved,
      selectedBy,
      notes
    };

    // Update locally immediately for instant UI feedback
    this.dailyModelsMap.set(key, item);
    this.persistStorage();
    this.dailyModelsSubject.next(this.dailyModelsMap);

    // Persist to database via backend API
    const payload = {
      employeeId,
      workDate: dateStr,
      workMode: model,
      selectedBy,
      notes
    };

    const req$ = this.http.post<ApiResponse<WorkModeBackendDTO>>(`${this.apiUrl}/SetWorkMode`, payload).pipe(
      tap(res => {
        if (res?.data) {
          const syncedItem: EmployeeDailyWorkModel = {
            id: res.data.id,
            employeeId: res.data.employeeId,
            employeeName: res.data.employeeName,
            dateStr: res.data.workDate,
            workModel: res.data.workMode as WorkModelType,
            isApproved: true,
            selectedBy: res.data.selectedBy,
            notes: res.data.notes
          };
          this.dailyModelsMap.set(key, syncedItem);
          this.persistStorage();
          this.dailyModelsSubject.next(this.dailyModelsMap);
        }
      }),
      catchError(err => {
        console.error('Failed to persist work mode to backend database', err);
        return of(null);
      })
    );

    // Auto-subscribe so the HTTP request always executes even if caller didn't subscribe
    req$.subscribe();

    return req$;
  }

  public getTodayWorkModel(employeeId: number): WorkModelType {
    const todayStr = this.formatDate(new Date());
    return this.getWorkModelForDate(employeeId, todayStr);
  }

  public setTodayWorkModel(employeeId: number, model: WorkModelType, selectedBy: string = 'Employee', notes?: string): Observable<any> {
    const todayStr = this.formatDate(new Date());
    return this.setWorkModelForDate(employeeId, todayStr, model, selectedBy, notes);
  }

  /**
   * Fetches the persistent work mode for an employee from the backend database and caches it.
   */
  public fetchForDate(employeeId: number, dateStr: string): Observable<WorkModelType> {
    return this.http.get<ApiResponse<WorkModeBackendDTO | null>>(`${this.apiUrl}/GetForDate?employeeId=${employeeId}&date=${dateStr}`).pipe(
      map(res => {
        if (res?.data) {
          const item: EmployeeDailyWorkModel = {
            id: res.data.id,
            employeeId: res.data.employeeId,
            employeeName: res.data.employeeName,
            dateStr: res.data.workDate,
            workModel: res.data.workMode as WorkModelType,
            isApproved: true,
            selectedBy: res.data.selectedBy,
            notes: res.data.notes
          };
          this.dailyModelsMap.set(`${employeeId}_${dateStr}`, item);
          this.persistStorage();
          this.dailyModelsSubject.next(this.dailyModelsMap);
          return item.workModel;
        }
        return this.getWorkModelForDate(employeeId, dateStr);
      }),
      catchError(err => {
        console.warn('Could not fetch work mode for date, falling back to local/preset', err);
        return of(this.getWorkModelForDate(employeeId, dateStr));
      })
    );
  }

  /**
   * Fetches work modes for an employee across a date range and caches them.
   */
  public fetchRange(employeeId: number, startDate: string, endDate: string): Observable<EmployeeDailyWorkModel[]> {
    return this.http.get<ApiResponse<WorkModeBackendDTO[]>>(`${this.apiUrl}/GetRange?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`).pipe(
      map(res => {
        const results: EmployeeDailyWorkModel[] = [];
        if (res?.data && Array.isArray(res.data)) {
          res.data.forEach(d => {
            const item: EmployeeDailyWorkModel = {
              id: d.id,
              employeeId: d.employeeId,
              employeeName: d.employeeName,
              dateStr: d.workDate,
              workModel: d.workMode as WorkModelType,
              isApproved: true,
              selectedBy: d.selectedBy,
              notes: d.notes
            };
            this.dailyModelsMap.set(`${d.employeeId}_${d.workDate}`, item);
            results.push(item);
          });
          this.persistStorage();
          this.dailyModelsSubject.next(this.dailyModelsMap);
        }
        return results;
      }),
      catchError(err => {
        console.warn('Could not fetch work mode range from backend', err);
        return of([]);
      })
    );
  }

  /**
   * Fetches all employees' work modes for a date (for Admin/HR/Manager overview) and caches them.
   */
  public fetchAllForDate(dateStr: string): Observable<EmployeeDailyWorkModel[]> {
    return this.http.get<ApiResponse<WorkModeBackendDTO[]>>(`${this.apiUrl}/GetAllForDate?date=${dateStr}`).pipe(
      map(res => {
        const results: EmployeeDailyWorkModel[] = [];
        if (res?.data && Array.isArray(res.data)) {
          res.data.forEach(d => {
            const item: EmployeeDailyWorkModel = {
              id: d.id,
              employeeId: d.employeeId,
              employeeName: d.employeeName,
              dateStr: d.workDate,
              workModel: d.workMode as WorkModelType,
              isApproved: true,
              selectedBy: d.selectedBy,
              notes: d.notes
            };
            this.dailyModelsMap.set(`${d.employeeId}_${d.workDate}`, item);
            results.push(item);
          });
          this.persistStorage();
          this.dailyModelsSubject.next(this.dailyModelsMap);
        }
        return results;
      }),
      catchError(err => {
        console.warn('Could not fetch all work modes for date from backend', err);
        return of([]);
      })
    );
  }

  /**
   * Calculates employee's weekly hybrid compliance for a given week
   */
  public getWeeklyHybridProgress(employeeId: number, targetDate: Date = new Date()): {
    wfoCount: number;
    wfhCount: number;
    requiredWfo: number;
    allowedWfh: number;
    isCompliant: boolean;
    daysSummary: { dayName: string; dateStr: string; mode: WorkModelType }[];
  } {
    const policy = this.getPolicy();
    const curr = new Date(targetDate);
    const firstDay = curr.getDate() - curr.getDay() + 1; // Monday
    const monday = new Date(curr.setDate(firstDay));

    let wfoCount = 0;
    let wfhCount = 0;
    const daysSummary: { dayName: string; dateStr: string; mode: WorkModelType }[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = this.formatDate(d);
      const mode = this.getWorkModelForDate(employeeId, dStr);

      if (mode === 'WFO') wfoCount++;
      if (mode === 'WFH') wfhCount++;

      daysSummary.push({
        dayName: dayNames[i],
        dateStr: dStr,
        mode
      });
    }

    const isCompliant = wfoCount >= policy.hybridWeeklyWfoDays;

    return {
      wfoCount,
      wfhCount,
      requiredWfo: policy.hybridWeeklyWfoDays,
      allowedWfh: policy.hybridWeeklyWfhDays,
      isCompliant,
      daysSummary
    };
  }

  /**
   * Batch applies hybrid policy (e.g. 2 WFO / 3 WFH) across employees
   */
  public applyHybridPolicyToRoster(employees: any[], weekDates: { dateStr: string; dayIndex: number }[]): number {
    const policy = this.getPolicy();
    let appliedCount = 0;

    employees.forEach(emp => {
      const empId = Number(emp.id || emp.employeeId);
      if (!empId) return;

      weekDates.forEach(({ dateStr, dayIndex }) => {
        let mode: WorkModelType = 'WFO';
        switch (dayIndex) {
          case 1: mode = policy.schedulePreset.monday; break;
          case 2: mode = policy.schedulePreset.tuesday; break;
          case 3: mode = policy.schedulePreset.wednesday; break;
          case 4: mode = policy.schedulePreset.thursday; break;
          case 5: mode = policy.schedulePreset.friday; break;
          default: mode = 'WFO'; break;
        }

        this.setWorkModelForDate(empId, dateStr, mode, 'Policy');
        appliedCount++;
      });
    });

    this.toaster.success(
      `Applied ${policy.name} (${policy.hybridWeeklyWfoDays} WFO / ${policy.hybridWeeklyWfhDays} WFH) across ${employees.length} employees.`,
      'Hybrid Policy Applied'
    );
    return appliedCount;
  }

  public formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
