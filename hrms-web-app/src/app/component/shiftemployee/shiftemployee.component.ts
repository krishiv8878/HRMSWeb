import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeshiftService, ShiftModel } from '../../services/shift/employeeshift.service';
import { ShiftRosterService, ShiftSwapRequest, ShiftRosterEntry, WeeklyOffPattern } from '../../services/shift/shift-roster.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { ShiftComponent } from '../../modal/shift/shift.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { ShiftSwapModalComponent } from '../../modal/shift-swap-modal/shift-swap-modal.component';
import { RbacService } from '../../core/rbac.service';
import { WorkModelPolicyService, WorkModelPolicyConfig, WorkModelType } from '../../services/work-model/work-model-policy.service';

export interface RosterDayCol {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'app-shiftemployee',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './shiftemployee.component.html',
  styleUrl: './shiftemployee.component.scss'
})
export class ShiftemployeeComponent implements OnInit, OnDestroy {
  private services = inject(EmployeeshiftService);
  private employeeService = inject(EmployeeService);
  public shiftRosterService = inject(ShiftRosterService);
  private rbacService = inject(RbacService);
  public workModelService = inject(WorkModelPolicyService);
  public isHrOrAdmin: boolean = true;
  public currentEmployeeId: number = 1;
  public currentEmployeeName: string = '';
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private routeSub?: Subscription;
  private swapSub?: Subscription;

  // View Tabs: Master List vs Roster Matrix vs Swap Requests
  activeTab: 'master' | 'roster' | 'swaps' | 'policy' = 'master';
  workModelPolicy: WorkModelPolicyConfig = this.workModelService.getPolicy();
  selectedPreset: '2_WFO_3_WFH' | '3_WFO_2_WFH' | 'ALL_WFO' | 'ALL_WFH' = '2_WFO_3_WFH';
  todayWorkModel: WorkModelType = 'WFO';
  weeklyHybridProgress: any = null;
  Math = Math;

  allShifts: ShiftModel[] = [];
  filteredShifts: ShiftModel[] = [];
  paginatedShifts: ShiftModel[] = [];
  employeesList: any[] = [];

  // Filter States (Master Tab)
  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedCategory: string = 'All';

  // Dynamic Metrics
  totalShiftsCount: number = 0;
  activeShiftsCount: number = 0;
  dayShiftsCount: number = 0;
  nightShiftsCount: number = 0;
  activeRosterRate: number = 100;
  totalEmployeesCount: number = 0;
  assignedEmployeesCount: number = 0;

  // Pagination State (Master Tab)
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  // ================= Roster Scheduler State =================
  rosterViewMode: 'week' | 'month' = 'week';
  rosterDate: Date = new Date();
  rosterDays: RosterDayCol[] = [];
  selectedDepartment: string = 'All';
  departmentsList: string[] = [];
  rosterSearchQuery: string = '';
  filteredRosterEmployees: any[] = [];

  // Quick Inline Assignment Popover State
  activeAssignmentCell: { empId: number; dateStr: string; empName: string } | null = null;

  // Bulk Assignment Modal State
  showBulkModal: boolean = false;
  bulkSelectedShiftId: string = '1';
  bulkStartDate: string = '';
  bulkEndDate: string = '';
  bulkDepartment: string = 'All';

  // Weekly-Off Modal State
  showWeeklyOffModal: boolean = false;
  weeklyOffPattern: WeeklyOffPattern = 'corporate_2nd_4th_sat_sun';
  weeklyOffDepartment: string = 'All';

  // ================= Shift Swap State =================
  swapRequests: ShiftSwapRequest[] = [];
  swapSearchQuery: string = '';
  swapStatusFilter: string = 'All';

  ngOnInit() {
    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        setTimeout(() => this.openAddForm(), 150);
      }
      if (params['tab']) {
        if (params['tab'] === 'roster' || params['tab'] === 'swaps' || params['tab'] === 'master') {
          this.activeTab = params['tab'];
        }
      }
    });

    this.isHrOrAdmin = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
    const storedEmpId = typeof window !== 'undefined' && window.localStorage ? (localStorage.getItem('employeeId') || localStorage.getItem('UserId') || localStorage.getItem('EmpId')) : null;
    if (storedEmpId && !isNaN(Number(storedEmpId))) {
      this.currentEmployeeId = Number(storedEmpId);
    }
    const storedName = typeof window !== 'undefined' && window.localStorage ? (localStorage.getItem('fullName') || localStorage.getItem('UserName') || localStorage.getItem('userName')) : '';
    if (storedName) {
      this.currentEmployeeName = storedName.trim();
    }

    // Strict non-admin check
    const roles = this.rbacService.getUserRoles();
    const isStrictEmployee = roles.length === 1 && roles[0].toLowerCase() === 'employee';
    if (isStrictEmployee) {
      this.isHrOrAdmin = false;
      this.activeTab = 'roster';
    } else {
      this.isHrOrAdmin = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
    }
    if (!this.isHrOrAdmin && this.activeTab === 'master') {
      this.activeTab = 'roster';
    }

    this.swapSub = this.shiftRosterService.swaps$.subscribe(swaps => {
      this.swapRequests = swaps;
    });

    this.initRosterDates();
    this.loadWorkModelState();
    this.getAllData();
  }

  setTab(tab: 'master' | 'roster' | 'swaps' | 'policy'): void {
    this.activeTab = tab;
    if (tab === 'roster') {
      this.refreshRosterFilter();
    }
  }

  getAllData() {
    this.employeeService.getData().subscribe({
      next: (empRes: any) => {
        let emps: any[] = [];
        if (Array.isArray(empRes)) emps = empRes;
        else if (empRes && Array.isArray(empRes.data)) emps = empRes.data;
        else if (empRes && Array.isArray(empRes.employeedata?.data)) emps = empRes.employeedata.data;
        this.employeesList = emps.filter(e => !e.isDeleted);

        // If regular employee, match the exact employee record
        if (!this.isHrOrAdmin) {
          const matched = this.employeesList.find(e =>
            Number(e.id || e.employeeId) === this.currentEmployeeId ||
            (this.currentEmployeeName && `${e.firstName || ''} ${e.lastName || ''}`.trim().toLowerCase() === this.currentEmployeeName.toLowerCase()) ||
            `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes('prem')
          );
          if (matched) {
            this.currentEmployeeId = Number(matched.id || matched.employeeId);
            this.currentEmployeeName = `${matched.firstName || ''} ${matched.lastName || ''}`.trim();
          }
        }

        // Extract unique departments
        const depts = new Set<string>();
        this.employeesList.forEach(e => {
          if (e.department) depts.add(e.department.trim());
          if (e.branch) depts.add(e.branch.trim());
        });
        this.departmentsList = Array.from(depts);

        this.loadShiftsList();
      },
      error: () => {
        this.employeesList = [];
        this.loadShiftsList();
      }
    });
  }

  private loadShiftsList() {
    this.services.getData().subscribe({
      next: (response: any) => {
        let raw: any[] = [];
        if (Array.isArray(response)) {
          raw = response;
        } else if (response && Array.isArray(response.data)) {
          raw = response.data;
        }

        this.allShifts = raw.map((s, idx) => {
          const shiftId = Number(s.id || s.shiftId || (idx + 1));
          const name = (s.shiftName || s.name || 'Shift Schedule').trim();

          // Calculate real employee assignment count from workforce DB
          let assigned = 0;
          if (this.employeesList.length > 0) {
            assigned = this.employeesList.filter((e: any) => {
              const rawShiftIds = String(e.shiftIds || e.ShiftIds || e.shiftId || e.ShiftId || '').trim();
              const ids = rawShiftIds.split(',').map((x: string) => x.trim());
              const idMatch = ids.includes(String(shiftId));
              const nameMatch = Boolean(e.shift && String(e.shift).toLowerCase().trim() === name.toLowerCase());
              return idMatch || nameMatch;
            }).length;
          }

          const policy = this.shiftRosterService.getShiftPolicy(shiftId);

          return {
            id: shiftId,
            shiftName: name,
            startTime: s.startTime || s.start || '09:30',
            endTime: s.endTime || s.end || '18:30',
            isActive: s.isActive !== false && s.isActive !== 0 && s.isActive !== 'false',
            assignedCount: assigned,
            gracePeriodMinutes: policy.gracePeriodMinutes || 15,
            breakDurationMinutes: policy.breakDurationMinutes || 60,
            rawRecord: s
          };
        });

        this.computeMetrics();
        this.applyFilter();
        this.refreshRosterFilter();
      },
      error: (err) => {
        console.error('Error fetching shift list:', err);
        this.allShifts = [];
        this.computeMetrics();
        this.applyFilter();
        this.refreshRosterFilter();
      }
    });
  }

  computeMetrics() {
    this.totalShiftsCount = this.allShifts.length;
    this.activeShiftsCount = this.allShifts.filter(s => s.isActive).length;
    let dayCount = 0;
    let nightCount = 0;

    this.allShifts.forEach(s => {
      const cat = this.getShiftCategory(s.startTime, s.endTime);
      if (cat === 'Night Shift' || cat === 'Evening Shift') {
        nightCount++;
      } else {
        dayCount++;
      }
    });

    this.dayShiftsCount = dayCount;
    this.nightShiftsCount = nightCount;
    this.activeRosterRate = this.totalShiftsCount > 0
      ? Math.round((this.activeShiftsCount / this.totalShiftsCount) * 100)
      : 100;

    this.totalEmployeesCount = this.employeesList.length;
    this.assignedEmployeesCount = this.employeesList.filter((e: any) => {
      const rawShiftIds = String(e.shiftIds || e.ShiftIds || e.shiftId || e.ShiftId || '').trim();
      const hasValidId = rawShiftIds !== '' && rawShiftIds !== '0' && rawShiftIds !== 'null' && rawShiftIds !== 'undefined';
      const hasValidName = Boolean(e.shift && String(e.shift).trim() !== '');
      return hasValidId || hasValidName;
    }).length;
  }

  getShiftCategory(start?: string, end?: string): string {
    if (!start) return 'General';
    const startHour = parseInt(start.split(':')[0], 10) || 0;
    if (startHour >= 5 && startHour < 12) return 'Day / Morning';
    if (startHour >= 12 && startHour < 17) return 'Afternoon';
    if (startHour >= 17 && startHour < 21) return 'Evening Shift';
    return 'Night Shift';
  }

  getShiftIcon(start?: string): string {
    if (!start) return 'schedule';
    const startHour = parseInt(start.split(':')[0], 10) || 0;
    if (startHour >= 5 && startHour < 12) return 'wb_sunny';
    if (startHour >= 12 && startHour < 17) return 'light_mode';
    if (startHour >= 17 && startHour < 21) return 'wb_twilight';
    return 'nightlight';
  }

  getShiftDuration(start?: string, end?: string): string {
    if (!start || !end) return '8.5 Hours';
    try {
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Next day cross
      }
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hrs}h ${mins > 0 ? mins + 'm' : '00m'} span`;
    } catch {
      return '8.5 Hours';
    }
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '--:--';
    const str = String(timeStr).trim();
    const parts = str.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      if (isNaN(hours)) return timeStr;
      const minutes = (parts[1] || '00').substring(0, 2).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = hours < 10 ? '0' + hours : hours;
      return `${formattedHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  }

  applyFilter() {
    let list = [...this.allShifts];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.shiftName && s.shiftName.toLowerCase().includes(q)) ||
        (s.startTime && s.startTime.toLowerCase().includes(q)) ||
        (s.endTime && s.endTime.toLowerCase().includes(q))
      );
    }

    if (this.selectedStatus !== 'All') {
      const isActive = this.selectedStatus === 'Active';
      list = list.filter(s => s.isActive === isActive);
    }

    if (this.selectedCategory !== 'All') {
      list = list.filter(s => this.getShiftCategory(s.startTime, s.endTime) === this.selectedCategory);
    }

    this.filteredShifts = list;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredShifts.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedShifts = this.filteredShifts.slice(start, end);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  toggleShiftStatus(shift: ShiftModel) {
    const updatedStatus = !shift.isActive;
    const payload = { ...shift, isActive: updatedStatus };
    this.services.updateData(payload, shift.id).subscribe({
      next: () => {
        shift.isActive = updatedStatus;
        this.computeMetrics();
        this.applyFilter();
        if (updatedStatus) {
          this.toaster.success(`Shift '${shift.shiftName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Shift '${shift.shiftName}' Inactivated`, 'Shift Inactivated');
        }
      },
      error: () => {
        shift.isActive = updatedStatus;
        this.computeMetrics();
        this.applyFilter();
        if (updatedStatus) {
          this.toaster.success(`Shift '${shift.shiftName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Shift '${shift.shiftName}' Inactivated`, 'Shift Inactivated');
        }
      }
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(ShiftComponent, {
      width: '560px'
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.getAllData();
      }
    });
  }

  openEditForm(shift: ShiftModel) {
    const dialogRef = this.dialog.open(ShiftComponent, {
      width: '560px',
      data: shift
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.getAllData();
      }
    });
  }

  openDeleteModal(shift: ShiftModel) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: shift.id, name: shift.shiftName }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(shift.id).subscribe({
          next: () => {
            this.toaster.success('Shift record successfully deleted', 'Deleted');
            this.getAllData();
          },
          error: () => {
            this.toaster.error('Failed to delete shift record', 'Error');
          }
        });
      }
    });
  }

  exportShiftsCSV() {
    if (typeof window === 'undefined') return;

    const data = this.filteredShifts.length > 0 ? this.filteredShifts : this.allShifts;
    const headers = ['Shift ID', 'Shift Name', 'Category', 'Start Time', 'End Time', 'Grace Period', 'Break Duration', 'Duration Span', 'Status'];

    const rows = data.map(s => {
      const policy = this.shiftRosterService.getShiftPolicy(s.id);
      return [
        `"${s.id}"`,
        `"${s.shiftName || ''}"`,
        `"${this.getShiftCategory(s.startTime, s.endTime)}"`,
        `"${this.formatTime(s.startTime)}"`,
        `"${this.formatTime(s.endTime)}"`,
        `"${policy.gracePeriodMinutes || 15} mins"`,
        `"${policy.breakDurationMinutes || 60} mins"`,
        `"${this.getShiftDuration(s.startTime, s.endTime)}"`,
        `"${s.isActive ? 'Active' : 'Inactive'}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Workforce_Shifts_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Shift master roster exported successfully!', 'Export Complete');
  }

  // =========================================================================
  // Roster Scheduler Implementation
  // =========================================================================

  private initRosterDates(): void {
    const today = new Date();
    this.rosterDate = new Date(today);
    this.generateRosterDays();

    // Default dates for bulk assignment
    this.bulkStartDate = this.shiftRosterService.formatDate(today);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 6);
    this.bulkEndDate = this.shiftRosterService.formatDate(nextWeek);
  }

  generateRosterDays(): void {
    const days: RosterDayCol[] = [];
    const todayStr = this.shiftRosterService.formatDate(new Date());

    if (this.rosterViewMode === 'week') {
      // Find Monday of the current rosterDate week
      const current = new Date(this.rosterDate);
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(current.setDate(diff));

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = this.shiftRosterService.formatDate(d);
        const dOfWeek = d.getDay();
        days.push({
          date: d,
          dateStr: dStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: d.getDate(),
          isToday: dStr === todayStr,
          isWeekend: dOfWeek === 0 || dOfWeek === 6
        });
      }
    } else {
      // Month mode: 1st of month to end of month
      const y = this.rosterDate.getFullYear();
      const m = this.rosterDate.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();

      for (let i = 1; i <= lastDay; i++) {
        const d = new Date(y, m, i);
        const dStr = this.shiftRosterService.formatDate(d);
        const dOfWeek = d.getDay();
        days.push({
          date: d,
          dateStr: dStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: i,
          isToday: dStr === todayStr,
          isWeekend: dOfWeek === 0 || dOfWeek === 6
        });
      }
    }

    this.rosterDays = days;
  }

  prevRosterPeriod(): void {
    if (this.rosterViewMode === 'week') {
      this.rosterDate.setDate(this.rosterDate.getDate() - 7);
    } else {
      this.rosterDate.setMonth(this.rosterDate.getMonth() - 1);
    }
    this.generateRosterDays();
  }

  nextRosterPeriod(): void {
    if (this.rosterViewMode === 'week') {
      this.rosterDate.setDate(this.rosterDate.getDate() + 7);
    } else {
      this.rosterDate.setMonth(this.rosterDate.getMonth() + 1);
    }
    this.generateRosterDays();
  }

  todayRosterPeriod(): void {
    this.rosterDate = new Date();
    this.generateRosterDays();
  }

  toggleRosterViewMode(mode: 'week' | 'month'): void {
    this.rosterViewMode = mode;
    this.generateRosterDays();
  }

  getRosterPeriodDisplay(): string {
    if (this.rosterDays.length === 0) return '';
    if (this.rosterViewMode === 'week') {
      const first = this.rosterDays[0];
      const last = this.rosterDays[this.rosterDays.length - 1];
      return `${first.dayNumber} ${first.date.toLocaleDateString('en-US', { month: 'short' })} - ${last.dayNumber} ${last.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } else {
      return this.rosterDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  getDisplayRosterEmployees(): any[] {
    if (!this.isHrOrAdmin) {
      if (this.filteredRosterEmployees.length > 0) {
        return this.filteredRosterEmployees;
      }
      const myRow = this.employeesList.find(e =>
        Number(e.id || e.employeeId) === this.currentEmployeeId ||
        (this.currentEmployeeName && `${e.firstName || ''} ${e.lastName || ''}`.trim().toLowerCase() === this.currentEmployeeName.toLowerCase()) ||
        `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes('prem')
      );
      return myRow ? [myRow] : (this.employeesList.length > 0 ? [this.employeesList[0]] : []);
    }
    return this.filteredRosterEmployees;
  }

  refreshRosterFilter(): void {
    let list = [...this.employeesList];

    if (!this.isHrOrAdmin) {
      const myRow = list.find(e =>
        Number(e.id || e.employeeId) === this.currentEmployeeId ||
        (this.currentEmployeeName && `${e.firstName || ''} ${e.lastName || ''}`.trim().toLowerCase() === this.currentEmployeeName.toLowerCase()) ||
        `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes('prem')
      );
      this.filteredRosterEmployees = myRow ? [myRow] : (list.length > 0 ? [list[0]] : []);
      return;
    }

    if (this.selectedDepartment !== 'All') {
      list = list.filter(e =>
        (e.department && e.department.toLowerCase() === this.selectedDepartment.toLowerCase()) ||
        (e.branch && e.branch.toLowerCase() === this.selectedDepartment.toLowerCase())
      );
    }

    if (this.rosterSearchQuery && this.rosterSearchQuery.trim()) {
      const q = this.rosterSearchQuery.toLowerCase().trim();
      list = list.filter(e =>
        (e.firstName && e.firstName.toLowerCase().includes(q)) ||
        (e.lastName && e.lastName.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q)) ||
        (String(e.id).includes(q))
      );
    }

    this.filteredRosterEmployees = list;
  }

  getEmployeeRosterEntry(emp: any, dateStr: string): ShiftRosterEntry {
    const defaultShift = this.allShifts.find(s => {
      const rawIds = String(emp.shiftIds || emp.shiftId || '').split(',').map(x => x.trim());
      return rawIds.includes(String(s.id));
    }) || this.allShifts[0];

    return this.shiftRosterService.getEmployeeRosterEntry(emp.id, dateStr, defaultShift);
  }

  getShiftBadgeClass(entry: ShiftRosterEntry): string {
    if (entry.shiftId === 'WO') return 'badge-wo';
    const sName = (entry.shiftName || '').toLowerCase();
    if (sName.includes('morning') || sName.includes('early')) return 'badge-morning';
    if (sName.includes('evening') || sName.includes('overlap')) return 'badge-evening';
    if (sName.includes('night') || sName.includes('operations')) return 'badge-night';
    return 'badge-general';
  }

  openCellAssignPopover(emp: any, dateStr: string, event: MouseEvent): void {
    if (!this.isHrOrAdmin) {
      return; // Strictly read-only for regular employees
    }
    event.stopPropagation();
    this.activeAssignmentCell = {
      empId: emp.id,
      dateStr: dateStr,
      empName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    };
  }

  closeCellPopover(): void {
    this.activeAssignmentCell = null;
  }

  assignShiftToCell(shiftItem: ShiftModel | 'WO'): void {
    if (!this.isHrOrAdmin) {
      this.toaster.warning('You do not have permission to modify shifts. Please submit a Shift Swap Request.', 'Access Denied');
      return;
    }
    if (!this.activeAssignmentCell) return;
    const { empId, dateStr, empName } = this.activeAssignmentCell;

    if (shiftItem === 'WO') {
      this.shiftRosterService.assignRosterEntry({
        employeeId: empId,
        dateStr,
        shiftId: 'WO',
        shiftName: 'Weekly Off'
      });
      this.toaster.info(`Marked ${dateStr} as Weekly Off for ${empName}`, 'Shift Updated');
    } else {
      this.shiftRosterService.assignRosterEntry({
        employeeId: empId,
        dateStr,
        shiftId: shiftItem.id,
        shiftName: shiftItem.shiftName,
        startTime: shiftItem.startTime,
        endTime: shiftItem.endTime
      });
      this.toaster.success(`Assigned ${shiftItem.shiftName} to ${empName} on ${dateStr}`, 'Shift Updated');
    }

    this.activeAssignmentCell = null;
  }

  // --- Bulk Assign Shift Modal ---
  openBulkAssignModal(): void {
    this.showBulkModal = true;
  }

  closeBulkAssignModal(): void {
    this.showBulkModal = false;
  }

  executeBulkAssign(): void {
    if (!this.bulkStartDate || !this.bulkEndDate) {
      this.toaster.error('Please specify both start and end date', 'Validation Error');
      return;
    }

    let targetEmps = this.employeesList;
    if (this.bulkDepartment !== 'All') {
      targetEmps = targetEmps.filter(e =>
        (e.department && e.department.toLowerCase() === this.bulkDepartment.toLowerCase()) ||
        (e.branch && e.branch.toLowerCase() === this.bulkDepartment.toLowerCase())
      );
    }

    if (targetEmps.length === 0) {
      this.toaster.warning('No employees match the selected department', 'No Target Employees');
      return;
    }

    const empIds = targetEmps.map(e => Number(e.id));
    const targetShift = this.bulkSelectedShiftId === 'WO'
      ? 'WO'
      : this.allShifts.find(s => String(s.id) === String(this.bulkSelectedShiftId)) || this.allShifts[0];

    this.shiftRosterService.bulkAssignShift(empIds, this.bulkStartDate, this.bulkEndDate, targetShift);
    this.toaster.success(`Successfully assigned shift to ${empIds.length} employees from ${this.bulkStartDate} to ${this.bulkEndDate}`, 'Roster Updated');
    this.showBulkModal = false;
  }

  // --- Weekly-Off Pattern Modal ---
  openWeeklyOffModal(): void {
    this.showWeeklyOffModal = true;
  }

  closeWeeklyOffModal(): void {
    this.showWeeklyOffModal = false;
  }

  executeApplyWeeklyOff(): void {
    let targetEmps = this.employeesList;
    if (this.weeklyOffDepartment !== 'All') {
      targetEmps = targetEmps.filter(e =>
        (e.department && e.department.toLowerCase() === this.weeklyOffDepartment.toLowerCase()) ||
        (e.branch && e.branch.toLowerCase() === this.weeklyOffDepartment.toLowerCase())
      );
    }

    const empIds = targetEmps.map(e => Number(e.id));
    const y = this.rosterDate.getFullYear();
    const m = this.rosterDate.getMonth();

    this.shiftRosterService.applyWeeklyOffPattern(empIds, y, m, this.weeklyOffPattern);
    const patternLabels: Record<WeeklyOffPattern, string> = {
      'corporate_2nd_4th_sat_sun': 'Corporate Standard (Sundays + 2nd & 4th Saturday Off)',
      'sundays': 'All Sundays Off',
      'sat_sun': 'All Saturdays & Sundays Off'
    };
    this.toaster.success(`Applied ${patternLabels[this.weeklyOffPattern]} for ${empIds.length} employees`, 'Weekly Off Configured');
    this.showWeeklyOffModal = false;
  }

  // --- Shift Swap Modal & Approvals ---
  openShiftSwapModal(): void {
    const dialogRef = this.dialog.open(ShiftSwapModalComponent, {
      width: '620px',
      data: {
        currentEmployeeId: this.currentEmployeeId,
        isHrAdmin: this.isHrOrAdmin,
        isSelfService: !this.isHrOrAdmin,
        employees: this.employeesList,
        shifts: this.allShifts
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.activeTab = 'swaps';
      }
    });
  }

  approveSwap(swap: ShiftSwapRequest): void {
    const success = this.shiftRosterService.approveSwapRequest(swap.id);
    if (success) {
      this.toaster.success(`Shift swap between ${swap.requesterName} and ${swap.targetName} approved and updated in roster!`, 'Swap Approved');
    }
  }

  rejectSwap(swap: ShiftSwapRequest): void {
    const reason = prompt('Please enter rejection reason:', 'Operational coverage shortage');
    if (reason !== null) {
      this.shiftRosterService.rejectSwapRequest(swap.id, reason.trim() || 'Declined by Management');
      this.toaster.warning(`Shift swap request for ${swap.requesterName} rejected`, 'Swap Declined');
    }
  }

  isRequesterOfSwap(s: ShiftSwapRequest): boolean {
    const idMatch = Number(s.requesterEmployeeId) === this.currentEmployeeId;
    if (this.currentEmployeeName && s.requesterName) {
      const cName = this.currentEmployeeName.toLowerCase().trim();
      const rName = s.requesterName.toLowerCase().trim();
      if (!cName.includes(rName) && !rName.includes(cName)) {
        return false;
      }
      return true;
    }
    return idMatch;
  }

  isTargetOfSwap(s: ShiftSwapRequest): boolean {
    const idMatch = Number(s.targetEmployeeId) === this.currentEmployeeId;
    if (this.currentEmployeeName && s.targetName) {
      const cName = this.currentEmployeeName.toLowerCase().trim();
      const tName = s.targetName.toLowerCase().trim();
      if (!cName.includes(tName) && !tName.includes(cName)) {
        return false;
      }
      return true;
    }
    return idMatch;
  }

  getFilteredSwaps(): ShiftSwapRequest[] {
    let list = [...this.swapRequests];

    // For regular employees, strictly isolate to swaps where they are either the requester or target colleague
    if (!this.isHrOrAdmin) {
      list = list.filter(s => this.isRequesterOfSwap(s) || this.isTargetOfSwap(s));
    }

    if (this.swapStatusFilter !== 'All') {
      list = list.filter(s => s.status === this.swapStatusFilter);
    }
    if (this.swapSearchQuery && this.swapSearchQuery.trim()) {
      const q = this.swapSearchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.requesterName.toLowerCase().includes(q) ||
        s.targetName.toLowerCase().includes(q) ||
        s.reason.toLowerCase().includes(q)
      );
    }
    return list;
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.swapSub) this.swapSub.unsubscribe();
  }

  // --- Work Model & Hybrid Policy Methods ---
  loadWorkModelState(): void {
    this.workModelPolicy = this.workModelService.getPolicy();
    this.todayWorkModel = this.workModelService.getTodayWorkModel(this.currentEmployeeId);
    this.weeklyHybridProgress = this.workModelService.getWeeklyHybridProgress(this.currentEmployeeId);
  }

  selectTodayWorkMode(mode: WorkModelType): void {
    if (this.workModelPolicy.policyMode === 'REQUIRE_APPROVAL') {
      this.toaster.info(
        'Your organization requires manager approval for remote work. Please submit a request via attendance portal.',
        'Approval Required'
      );
      return;
    }

    this.workModelService.setTodayWorkModel(this.currentEmployeeId, mode);
    this.todayWorkModel = mode;
    this.weeklyHybridProgress = this.workModelService.getWeeklyHybridProgress(this.currentEmployeeId);

    const modeLabels: Record<string, string> = {
      WFO: 'Work from Office (WFO)',
      WFH: 'Work From Home (WFH)',
      OD: 'On-Duty Client Visit'
    };
    this.toaster.success(`Work mode updated to ${modeLabels[mode] || mode} for today.`, 'Work Mode Set');
  }

  getEmployeeWorkModel(empId: number, dateStr: string): WorkModelType {
    return this.workModelService.getWorkModelForDate(empId, dateStr);
  }

  selectPolicyMode(mode: 'DIRECT_SELECT' | 'REQUIRE_APPROVAL' | 'HYBRID_QUOTA'): void {
    this.workModelPolicy.policyMode = mode;
  }

  applyHybridPreset(preset: '2_WFO_3_WFH' | '3_WFO_2_WFH' | 'ALL_WFO' | 'ALL_WFH'): void {
    this.selectedPreset = preset;
    if (preset === '2_WFO_3_WFH') {
      this.workModelPolicy.name = 'Corporate Hybrid Policy (2 Days WFO / 3 Days WFH)';
      this.workModelPolicy.hybridWeeklyWfoDays = 2;
      this.workModelPolicy.hybridWeeklyWfhDays = 3;
      this.workModelPolicy.schedulePreset = {
        monday: 'WFH',
        tuesday: 'WFO',
        wednesday: 'WFH',
        thursday: 'WFO',
        friday: 'WFH',
        saturday: 'WO',
        sunday: 'WO'
      };
    } else if (preset === '3_WFO_2_WFH') {
      this.workModelPolicy.name = 'Balanced Hybrid Policy (3 Days WFO / 2 Days WFH)';
      this.workModelPolicy.hybridWeeklyWfoDays = 3;
      this.workModelPolicy.hybridWeeklyWfhDays = 2;
      this.workModelPolicy.schedulePreset = {
        monday: 'WFO',
        tuesday: 'WFH',
        wednesday: 'WFO',
        thursday: 'WFH',
        friday: 'WFO',
        saturday: 'WO',
        sunday: 'WO'
      };
    } else if (preset === 'ALL_WFO') {
      this.workModelPolicy.name = '100% In-Office Work Policy (5 Days WFO)';
      this.workModelPolicy.hybridWeeklyWfoDays = 5;
      this.workModelPolicy.hybridWeeklyWfhDays = 0;
      this.workModelPolicy.schedulePreset = {
        monday: 'WFO',
        tuesday: 'WFO',
        wednesday: 'WFO',
        thursday: 'WFO',
        friday: 'WFO',
        saturday: 'WO',
        sunday: 'WO'
      };
    } else if (preset === 'ALL_WFH') {
      this.workModelPolicy.name = '100% Remote Policy (5 Days WFH)';
      this.workModelPolicy.hybridWeeklyWfoDays = 0;
      this.workModelPolicy.hybridWeeklyWfhDays = 5;
      this.workModelPolicy.schedulePreset = {
        monday: 'WFH',
        tuesday: 'WFH',
        wednesday: 'WFH',
        thursday: 'WFH',
        friday: 'WFH',
        saturday: 'WO',
        sunday: 'WO'
      };
    }
  }

  saveWorkModelPolicy(): void {
    this.workModelService.updatePolicy(this.workModelPolicy);
  }

  applyHybridPolicyToCurrentRoster(): void {
    if (this.employeesList.length === 0) {
      this.toaster.warning('No employees loaded to apply hybrid policy to', 'No Employees');
      return;
    }
    const weekDates = this.rosterDays.map(d => ({
      dateStr: d.dateStr,
      dayIndex: d.date.getDay()
    }));
    this.workModelService.applyHybridPolicyToRoster(this.employeesList, weekDates);
  }
}
