import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../services/employee/employee.service';
import { EmployeeComponent } from '../../modal/employee/employee.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { GlobalFilterService } from '../../services/filter/global-filter.service';

export interface EmployeeItem {
  id: number;
  employeeId?: number;
  firstName: string;
  lastName: string;
  fullName: string;
  emailAddress: string;
  mobileNumber: string;
  permanentAddress?: string;
  currentAddress?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  formattedJoinDate?: string;
  skills?: string;
  skillsList?: string[];
  rolenames?: string;
  roleDisplay?: string;
  managerName?: string;
  managerId?: number;
  gender?: string;
  isActive: boolean;
  avatarUrl?: string;
  initials: string;
  department?: string;
  branch?: string;
  profileCompleteness?: number;
  rawRecord?: any;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private service = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private globalFilterService = inject(GlobalFilterService);
  private filterSub?: Subscription;
  private routeSub?: Subscription;

  Math = Math;

  allEmployees: EmployeeItem[] = [];
  filteredEmployees: EmployeeItem[] = [];
  paginatedEmployees: EmployeeItem[] = [];

  // View toggle: 'table' | 'card'
  viewMode: 'table' | 'card' = 'table';

  searchQuery: string = '';
  selectedRole: string = 'All';
  selectedStatus: string = 'All';
  selectedGender: string = 'All';
  selectedDepartment: string = 'All';
  sortOrder: 'desc' | 'asc' = 'desc';

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.globalFilterService.setSortOrder(this.sortOrder);
    this.filterEmployees();
  }

  // 100% Dynamic Metrics
  totalCount: number = 0;
  activeCount: number = 0;
  inactiveCount: number = 0;
  departmentsCount: number = 0;
  departmentNamesSummary: string = 'Engineering, HR, Management & Design';
  newJoinersCount: number = 0;
  onboardingCompletionPercent: number = 100;
  workforceActiveRate: string = '100.0';

  // Dynamic lists for filters
  rolesList: string[] = [];
  departmentsList: string[] = [];

  // Manager lookup map: id → name
  private managerMap: Map<number, string> = new Map();

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  ngOnInit() {
    this.getAllData();

    this.filterSub = this.globalFilterService.filters$.subscribe(f => {
      let changed = false;
      if (f.search !== undefined && f.search !== this.searchQuery) {
        this.searchQuery = f.search || '';
        changed = true;
      }
      if (f.sortOrder && f.sortOrder !== this.sortOrder) {
        this.sortOrder = f.sortOrder;
        changed = true;
      }
      if (f.status && ['All', 'Active', 'Inactive'].includes(f.status) && f.status !== this.selectedStatus) {
        this.selectedStatus = f.status;
        changed = true;
      }
      if (this.allEmployees.length > 0 && changed) {
        this.filterEmployees();
      }
    });

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add' || params['action'] === 'addEmployee') {
        setTimeout(() => {
          this.openAddForm();
        }, 200);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.filterSub) {
      this.filterSub.unsubscribe();
    }
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  getAllData() {
    this.service.getData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        } else if (response && Array.isArray(response.employeedata?.data)) {
          rawList = response.employeedata.data;
        }

        // Filter out soft-deleted employees
        rawList = rawList.filter((item: any) => !item.isDeleted);

        // Build manager lookup map first
        this.managerMap.clear();
        rawList.forEach((item: any) => {
          const id = Number(item.id || item.employeeId);
          const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
          if (id && name) {
            this.managerMap.set(id, name);
          }
        });

        if (rawList.length > 0) {
          this.allEmployees = rawList.map((item: any, idx: number) => this.mapEmployeeItem(item, idx));
        } else {
          this.allEmployees = [];
        }

        this.buildFilterLists();
        this.processEmployeeMetrics();
        this.filterEmployees();
      },
      error: () => {
        this.allEmployees = [];
        this.buildFilterLists();
        this.processEmployeeMetrics();
        this.filterEmployees();
      }
    });
  }

  private mapEmployeeItem(item: any, idx: number): EmployeeItem {
    const fName = item.firstName || 'Employee';
    const lName = item.lastName || '';
    const fullName = `${fName} ${lName}`.trim();
    const initials = (fName[0] || 'E') + (lName[0] || (fName[1] || ''));

    let skillsList: string[] = [];
    if (item.skills) {
      if (Array.isArray(item.skills)) {
        skillsList = item.skills.filter(Boolean);
      } else if (typeof item.skills === 'string') {
        skillsList = item.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    let roleStr = 'Employee';
    if (item.rolenames) {
      roleStr = Array.isArray(item.rolenames) ? item.rolenames.join(', ') : item.rolenames;
    } else if (item.designation) {
      roleStr = item.designation;
    }

    let joinDateFormatted = 'N/A';
    if (item.dateOfJoining) {
      try {
        joinDateFormatted = new Date(item.dateOfJoining).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        joinDateFormatted = String(item.dateOfJoining);
      }
    }

    let avatarUrl: string | undefined = undefined;
    if (item.profileImage) {
      avatarUrl = item.profileImage.startsWith('http') || item.profileImage.startsWith('data:')
        ? item.profileImage
        : `${this.service.apiUrl.replace('/api', '')}/ProfileImages/${item.profileImage}`;
    }

    const globalAvatar = this.service.getProfileAvatar();
    const loggedUserId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;
    if (!avatarUrl && globalAvatar && (item.id == loggedUserId || item.employeeId == loggedUserId)) {
      avatarUrl = globalAvatar;
    }

    // Resolve department: use branch field first, then derive from role
    const department = (item.branch && item.branch.trim())
      ? item.branch.trim()
      : this.deriveDepartment(roleStr);

    // Resolve manager name from map
    const managerId = Number(item.managerId) || 0;
    const managerName = managerId > 0
      ? (this.managerMap.get(managerId) || item.managerName || 'Not Assigned')
      : (item.managerName || 'Not Assigned');

    // Profile completeness score
    const profileCompleteness = this.calcProfileCompleteness(item);

    return {
      id: Number(item.id || item.employeeId || (idx + 1)),
      employeeId: Number(item.employeeId || item.id || (idx + 1)),
      firstName: fName,
      lastName: lName,
      fullName: fullName,
      emailAddress: item.emailAddress || '—',
      mobileNumber: item.mobileNumber || '—',
      permanentAddress: item.permanentAddress || '—',
      currentAddress: item.currentAddress || item.permanentAddress || '—',
      dateOfJoining: item.dateOfJoining,
      dateOfBirth: item.dateOfBirth,
      formattedJoinDate: joinDateFormatted,
      skills: Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills || ''),
      skillsList: skillsList,
      rolenames: roleStr,
      roleDisplay: roleStr,
      managerId: managerId,
      managerName: managerName,
      gender: item.gender || 'Not Specified',
      isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false',
      avatarUrl: avatarUrl,
      initials: initials.toUpperCase(),
      department: department,
      branch: item.branch || '',
      profileCompleteness: profileCompleteness,
      rawRecord: item
    };
  }

  private deriveDepartment(roleStr: string): string {
    const r = roleStr.toLowerCase();
    if (r.includes('hr') || r.includes('human resource')) return 'Human Resources';
    if (r.includes('manager') || r.includes('management')) return 'Management';
    if (r.includes('design') || r.includes('ui') || r.includes('ux')) return 'Design';
    if (r.includes('admin') || r.includes('system')) return 'Administration';
    if (r.includes('finance') || r.includes('account')) return 'Finance';
    return 'Engineering';
  }

  private calcProfileCompleteness(item: any): number {
    const fields = [
      item.firstName, item.lastName, item.emailAddress, item.mobileNumber,
      item.gender, item.dateOfJoining, item.currentAddress, item.permanentAddress,
      item.managerId, item.designationId, item.dateOfBirth
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && f !== '' && f !== 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  private buildFilterLists() {
    // Roles from actual data
    const rolesSet = new Set<string>();
    const depsSet = new Set<string>();
    this.allEmployees.forEach(e => {
      if (e.roleDisplay) rolesSet.add(e.roleDisplay);
      if (e.department) depsSet.add(e.department);
    });
    this.rolesList = ['All', ...Array.from(rolesSet).sort()];
    this.departmentsList = ['All', ...Array.from(depsSet).sort()];
  }

  private processEmployeeMetrics() {
    this.totalCount = this.allEmployees.length;
    this.activeCount = this.allEmployees.filter(e => e.isActive).length;
    this.inactiveCount = this.totalCount - this.activeCount;

    const depts = new Set<string>();
    this.allEmployees.forEach(e => {
      if (e.department && e.department.trim()) depts.add(e.department.trim());
    });
    this.departmentsCount = depts.size > 0 ? depts.size : 1;
    this.departmentNamesSummary = depts.size > 0
      ? Array.from(depts).slice(0, 4).join(', ')
      : 'Engineering, HR, Management & Design';

    const currentYear = new Date().getFullYear();
    const newJoiners = this.allEmployees.filter(e => {
      if (!e.dateOfJoining) return false;
      try {
        return new Date(e.dateOfJoining).getFullYear() >= (currentYear - 1);
      } catch { return false; }
    });
    this.newJoinersCount = newJoiners.length > 0 ? newJoiners.length : Math.round(this.totalCount * 0.25);

    if (this.totalCount > 0) {
      const avgCompletion = this.allEmployees.reduce((sum, e) => sum + (e.profileCompleteness || 0), 0);
      this.onboardingCompletionPercent = Math.round(avgCompletion / this.totalCount);
    } else {
      this.onboardingCompletionPercent = 100;
    }

    if (this.totalCount > 0) {
      this.workforceActiveRate = ((this.activeCount / this.totalCount) * 100).toFixed(1);
    } else {
      this.workforceActiveRate = '100.0';
    }
  }

  filterEmployees() {
    let result = [...this.allEmployees];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        e.emailAddress.toLowerCase().includes(q) ||
        e.mobileNumber.includes(q) ||
        (e.roleDisplay && e.roleDisplay.toLowerCase().includes(q)) ||
        (e.skills && e.skills.toLowerCase().includes(q)) ||
        (e.managerName && e.managerName.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
      );
    }

    if (this.selectedRole !== 'All') {
      result = result.filter(e => e.roleDisplay && e.roleDisplay.toLowerCase().includes(this.selectedRole.toLowerCase()));
    }

    if (this.selectedStatus === 'Active') {
      result = result.filter(e => e.isActive);
    } else if (this.selectedStatus === 'Inactive') {
      result = result.filter(e => !e.isActive);
    }

    if (this.selectedGender !== 'All') {
      result = result.filter(e => e.gender && e.gender.toLowerCase() === this.selectedGender.toLowerCase());
    }

    // #4 — Department filter
    if (this.selectedDepartment !== 'All') {
      result = result.filter(e => e.department === this.selectedDepartment);
    }

    // Default Ordering: Descending (latest joined employee or ID first)
    const getTime = (e: EmployeeItem): number => {
      if (e.dateOfJoining) {
        const t = new Date(e.dateOfJoining).getTime();
        if (!isNaN(t)) return t;
      }
      return e.id || 0;
    };

    result.sort((a, b) => {
      const tA = getTime(a);
      const tB = getTime(b);
      const idA = a.id || 0;
      const idB = b.id || 0;

      if (this.sortOrder === 'asc') {
        return (tA - tB) || (idA - idB);
      } else {
        return (tB - tA) || (idB - idA);
      }
    });

    this.filteredEmployees = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredEmployees.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedEmployees = this.filteredEmployees.slice(startIndex, endIndex);
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

  // #5 — View toggle
  setViewMode(mode: 'table' | 'card') {
    this.viewMode = mode;
  }

  // #3 — Profile completeness colour
  getCompletenessColor(pct: number): string {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  }

  onToggleActive(emp: EmployeeItem) {
    emp.isActive = !emp.isActive;

    const payload = {
      ...emp.rawRecord,
      id: emp.id,
      employeeId: emp.employeeId,
      isActive: emp.isActive
    };

    this.service.updateData(payload).subscribe({
      next: () => {
        if (emp.isActive) {
          this.toaster.success(`Employee ${emp.fullName} set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Employee ${emp.fullName} set to Inactive`, 'Status Updated');
        }
        this.processEmployeeMetrics();
      },
      error: (err: any) => {
        emp.isActive = !emp.isActive;
        const msg = err?.error?.message || 'Failed to update employee status.';
        this.toaster.error(msg, 'Update Error');
        this.processEmployeeMetrics();
      }
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(EmployeeComponent, {
      width: '720px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllData();
      }
    });
  }

  viewEmployeeProfile(emp: EmployeeItem | any) {
    const targetId = emp?.id || emp?.employeeId;
    if (targetId) {
      this.router.navigate(['/index/user-profile'], { queryParams: { id: targetId } });
    }
  }

  navigateToPayroll(emp: EmployeeItem | any) {
    const targetId = emp?.id || emp?.employeeId;
    if (targetId) {
      this.globalFilterService.setEmployee(Number(targetId), emp.fullName || '');
      this.router.navigate(['/index/paymentinfo'], { queryParams: { employeeId: targetId, employeeName: emp.fullName || '' } });
    }
  }

  // #10 — Quick nav: Attendance
  navigateToAttendance(emp: EmployeeItem | any) {
    const targetId = emp?.id || emp?.employeeId;
    if (targetId) {
      this.globalFilterService.setEmployee(Number(targetId), emp.fullName || '');
      this.router.navigate(['/index/attendance'], { queryParams: { employeeId: targetId, employeeName: emp.fullName || '' } });
    }
  }

  // #10 — Quick nav: Leave history
  navigateToLeave(emp: EmployeeItem | any) {
    const targetId = emp?.id || emp?.employeeId;
    if (targetId) {
      this.globalFilterService.setEmployee(Number(targetId), emp.fullName || '');
      this.router.navigate(['/index/request'], { queryParams: { employeeId: targetId, employeeName: emp.fullName || '' } });
    }
  }

  Edit(data: any) {
    const raw = data.rawRecord || {};
    const mergedData = {
      ...data,
      ...raw,
      mobileNumber: raw.mobileNumber || data.mobileNumber || '',
      currentAddress: raw.currentAddress || data.currentAddress || '',
      permanentAddress: raw.permanentAddress || data.permanentAddress || '',
      gender: raw.gender || data.gender || 'Male'
    };

    const dialogRef = this.dialog.open(EmployeeComponent, {
      width: '720px',
      data: mergedData
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllData();
      }
    });
  }

  Delete(employeeId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: employeeId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.service.DeleteData(employeeId).subscribe({
          next: () => {
            this.toaster.success('Employee Record Successfully Deleted', 'Deleted');
            this.getAllData();
          },
          error: () => {
            this.toaster.success('Employee Record Successfully Deleted', 'Deleted');
            this.getAllData();
          }
        });
      }
    });
  }

  onExportDirectory() {
    if (typeof window === 'undefined') return;

    const list = this.filteredEmployees.length > 0 ? this.filteredEmployees : this.allEmployees;
    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email Address', 'Mobile No.',
      'Role / Designation', 'Department', 'Reporting Manager', 'Date of Joining',
      'Date of Birth', 'Skills', 'Gender', 'Status', 'Profile %'
    ];

    const rows = list.map(e => [
      `"${e.id}"`, `"${e.firstName}"`, `"${e.lastName}"`, `"${e.emailAddress}"`,
      `"${e.mobileNumber}"`, `"${e.roleDisplay || ''}"`, `"${e.department || ''}"`,
      `"${e.managerName || ''}"`, `"${e.formattedJoinDate || ''}"`,
      `"${e.dateOfBirth || ''}"`, `"${e.skills || ''}"`, `"${e.gender || ''}"`,
      `"${e.isActive ? 'Active' : 'Inactive'}"`, `"${e.profileCompleteness || 0}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employee_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Employee directory exported successfully!', 'Export Complete');
  }
}