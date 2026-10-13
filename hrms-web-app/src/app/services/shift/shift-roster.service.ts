import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { EmployeeService } from '../employee/employee.service';

export interface ShiftMetadata {
  shiftId: number;
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  isRotational: boolean;
}

export interface ShiftRosterEntry {
  employeeId: number;
  dateStr: string; // YYYY-MM-DD
  shiftId: number | 'WO'; // number = ShiftMaster ID, 'WO' = Weekly Off
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  isOverridden?: boolean;
}

export interface ShiftSwapRequest {
  id: number;
  requesterEmployeeId: number;
  requesterName: string;
  requesterDate: string; // YYYY-MM-DD
  requesterShiftId: number;
  requesterShiftName: string;
  targetEmployeeId: number;
  targetName: string;
  targetDate: string; // YYYY-MM-DD
  targetShiftId: number;
  targetShiftName: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  actionBy?: string;
  actionDate?: string;
  rejectionReason?: string;
}

export type WeeklyOffPattern = 'sundays' | 'sat_sun' | 'corporate_2nd_4th_sat_sun';

const STORAGE_ROSTER_KEY = 'hrms_shift_roster_schedule';
const STORAGE_SWAPS_KEY = 'hrms_shift_swap_requests';
const STORAGE_POLICIES_KEY = 'hrms_shift_extra_policies';

@Injectable({
  providedIn: 'root'
})
export class ShiftRosterService {
  private employeeService = inject(EmployeeService);

  private rosterMap: Map<string, ShiftRosterEntry> = new Map(); // Key: `${empId}_${dateStr}`
  private swapsSubject = new BehaviorSubject<ShiftSwapRequest[]>([]);
  public swaps$: Observable<ShiftSwapRequest[]> = this.swapsSubject.asObservable();

  private shiftPolicies: Map<number, ShiftMetadata> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      // 1. Load Roster overrides
      const rawRoster = localStorage.getItem(STORAGE_ROSTER_KEY);
      if (rawRoster) {
        const parsed: ShiftRosterEntry[] = JSON.parse(rawRoster);
        parsed.forEach(entry => {
          this.rosterMap.set(`${entry.employeeId}_${entry.dateStr}`, entry);
        });
      }

      // 2. Load Swaps
      const rawSwaps = localStorage.getItem(STORAGE_SWAPS_KEY);
      if (rawSwaps) {
        try {
          const parsed = JSON.parse(rawSwaps);
          // Purge dummy/mock swaps that have non-existent demo employees
          const cleaned = Array.isArray(parsed) ? parsed.filter((s: any) =>
            s.requesterName !== 'Aman Sharma' && s.targetName !== 'Rohit Verma'
          ) : [];
          this.swapsSubject.next(cleaned);
          this.saveSwapsToStorage(cleaned);
        } catch {
          this.swapsSubject.next([]);
        }
      } else {
        this.swapsSubject.next([]);
        this.saveSwapsToStorage([]);
      }

      // 3. Load Shift Policies
      const rawPolicies = localStorage.getItem(STORAGE_POLICIES_KEY);
      if (rawPolicies) {
        const parsed: ShiftMetadata[] = JSON.parse(rawPolicies);
        parsed.forEach(p => this.shiftPolicies.set(p.shiftId, p));
      }
    } catch (e) {
      console.error('Error loading shift roster storage:', e);
    }
  }

  private saveRosterToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const array = Array.from(this.rosterMap.values());
    localStorage.setItem(STORAGE_ROSTER_KEY, JSON.stringify(array));
  }

  private saveSwapsToStorage(swaps: ShiftSwapRequest[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(STORAGE_SWAPS_KEY, JSON.stringify(swaps));
  }

  private savePoliciesToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const array = Array.from(this.shiftPolicies.values());
    localStorage.setItem(STORAGE_POLICIES_KEY, JSON.stringify(array));
  }

  public formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // --- Policy Methods ---
  public getShiftPolicy(shiftId: number): ShiftMetadata {
    if (this.shiftPolicies.has(shiftId)) {
      return this.shiftPolicies.get(shiftId)!;
    }
    return {
      shiftId,
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60,
      isRotational: false
    };
  }

  public setShiftPolicy(meta: ShiftMetadata): void {
    this.shiftPolicies.set(meta.shiftId, meta);
    this.savePoliciesToStorage();
  }

  // --- Roster Methods ---
  public getEmployeeRosterEntry(employeeId: number, dateStr: string, defaultShift?: any): ShiftRosterEntry {
    const key = `${employeeId}_${dateStr}`;
    if (this.rosterMap.has(key)) {
      return this.rosterMap.get(key)!;
    }

    // Default calculation based on weekly-off or employee's default shift
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat

    // By default: Sunday is Weekly Off
    if (dayOfWeek === 0) {
      return {
        employeeId,
        dateStr,
        shiftId: 'WO',
        shiftName: 'Weekly Off',
        isOverridden: false
      };
    }

    const sId = defaultShift?.id ? Number(defaultShift.id) : 1;
    const sName = defaultShift?.shiftName || 'General Shift';
    const sStart = defaultShift?.startTime || '09:30';
    const sEnd = defaultShift?.endTime || '18:30';

    return {
      employeeId,
      dateStr,
      shiftId: sId,
      shiftName: sName,
      startTime: sStart,
      endTime: sEnd,
      isOverridden: false
    };
  }

  public assignRosterEntry(entry: ShiftRosterEntry): void {
    const key = `${entry.employeeId}_${entry.dateStr}`;
    entry.isOverridden = true;
    this.rosterMap.set(key, entry);
    this.saveRosterToStorage();
  }

  public bulkAssignShift(employeeIds: number[], startDate: string, endDate: string, shift: any): void {
    const cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const dStr = this.formatDate(cur);
      for (const empId of employeeIds) {
        if (shift === 'WO') {
          this.assignRosterEntry({
            employeeId: empId,
            dateStr: dStr,
            shiftId: 'WO',
            shiftName: 'Weekly Off'
          });
        } else {
          this.assignRosterEntry({
            employeeId: empId,
            dateStr: dStr,
            shiftId: Number(shift.id),
            shiftName: shift.shiftName,
            startTime: shift.startTime,
            endTime: shift.endTime
          });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  /**
   * Applies corporate weekly-off patterns to a whole month
   * e.g. corporate_2nd_4th_sat_sun: All Sundays + 2nd & 4th Saturday Off
   */
  public applyWeeklyOffPattern(employeeIds: number[], year: number, month: number, pattern: WeeklyOffPattern): void {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let saturdayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      const dStr = this.formatDate(d);

      let isOff = false;
      if (dayOfWeek === 6) {
        saturdayCount++;
      }

      if (pattern === 'sundays' && dayOfWeek === 0) {
        isOff = true;
      } else if (pattern === 'sat_sun' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        isOff = true;
      } else if (pattern === 'corporate_2nd_4th_sat_sun') {
        if (dayOfWeek === 0) {
          isOff = true;
        } else if (dayOfWeek === 6 && (saturdayCount === 2 || saturdayCount === 4)) {
          isOff = true;
        }
      }

      if (isOff) {
        for (const empId of employeeIds) {
          this.assignRosterEntry({
            employeeId: empId,
            dateStr: dStr,
            shiftId: 'WO',
            shiftName: 'Weekly Off'
          });
        }
      }
    }
  }

  // --- Shift Swap Methods ---
  public getSwapRequests(): ShiftSwapRequest[] {
    return this.swapsSubject.getValue();
  }

  public createSwapRequest(req: Omit<ShiftSwapRequest, 'id' | 'status' | 'requestedAt'>): ShiftSwapRequest {
    const list = this.getSwapRequests();
    const newSwap: ShiftSwapRequest = {
      ...req,
      id: list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1,
      status: 'Pending',
      requestedAt: new Date().toISOString()
    };

    const updated = [newSwap, ...list];
    this.swapsSubject.next(updated);
    this.saveSwapsToStorage(updated);
    return newSwap;
  }

  public approveSwapRequest(swapId: number, approverName = 'Manager/HR'): boolean {
    const list = this.getSwapRequests();
    const item = list.find(s => s.id === swapId);
    if (!item) return false;

    // Execute the shift swap in the roster map
    const requesterEntry = this.getEmployeeRosterEntry(item.requesterEmployeeId, item.requesterDate);
    const targetEntry = this.getEmployeeRosterEntry(item.targetEmployeeId, item.targetDate);

    // Swap shift assignments
    this.assignRosterEntry({
      employeeId: item.requesterEmployeeId,
      dateStr: item.requesterDate,
      shiftId: targetEntry.shiftId,
      shiftName: targetEntry.shiftName,
      startTime: targetEntry.startTime,
      endTime: targetEntry.endTime
    });

    this.assignRosterEntry({
      employeeId: item.targetEmployeeId,
      dateStr: item.targetDate,
      shiftId: requesterEntry.shiftId,
      shiftName: requesterEntry.shiftName,
      startTime: requesterEntry.startTime,
      endTime: requesterEntry.endTime
    });

    item.status = 'Approved';
    item.actionBy = approverName;
    item.actionDate = new Date().toISOString();

    this.swapsSubject.next([...list]);
    this.saveSwapsToStorage(list);
    return true;
  }

  public rejectSwapRequest(swapId: number, reason: string, approverName = 'Manager/HR'): boolean {
    const list = this.getSwapRequests();
    const item = list.find(s => s.id === swapId);
    if (!item) return false;

    item.status = 'Rejected';
    item.rejectionReason = reason;
    item.actionBy = approverName;
    item.actionDate = new Date().toISOString();

    this.swapsSubject.next([...list]);
    this.saveSwapsToStorage(list);
    return true;
  }
}
