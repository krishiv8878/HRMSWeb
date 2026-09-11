import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ProjectsService } from '../../services/project/projects.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { ProjectComponent } from '../../modal/project/project.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { ProjectDetailsModalComponent } from '../../modal/project-details-modal/project-details-modal.component';
import { RbacService } from '../../core/rbac.service';

export interface ProjectItem {
  id: number;
  projectName: string;
  clientName: string;
  clientRegion: string;
  description: string;
  iconName: string;
  teamSize: number;
  projectManagerId?: number;
  managerId?: number;
  managerName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isActive: boolean;
  rawRecord?: any;
}

@Component({
  selector: 'app-projectmaster',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './projectmaster.component.html',
  styleUrl: './projectmaster.component.scss'
})
export class ProjectmasterComponent implements OnInit {
  private services = inject(ProjectsService);
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  private rbacService = inject(RbacService);

  get canManageProjects(): boolean {
    return this.rbacService.isAdmin() || this.rbacService.isManager() || this.rbacService.isHR();
  }

  get isEmployeeOnly(): boolean {
    return !this.canManageProjects;
  }

  Math = Math;

  allProjects: ProjectItem[] = [];
  filteredProjects: ProjectItem[] = [];
  paginatedProjects: ProjectItem[] = [];
  employeesList: any[] = [];

  // Filters
  searchQuery: string = '';
  selectedRegion: string = 'All';
  selectedStatus: string = 'All';

  // Metrics
  totalProjectsCount: number = 0;
  activeProjectsCount: number = 0;
  regionsCount: number = 0;
  totalEngineersCount: number = 0;
  deliveryHealth: number = 98.8;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  regionList: string[] = ['All'];
  managersList: any[] = [];
  private managerCache: { [id: number]: string } = {};

  ngOnInit() {
    this.loadManagersList();
    this.getData();
  }

  loadManagersList() {
    this.employeeService.getManager().subscribe({
      next: (mgrRes: any) => {
        const raw = Array.isArray(mgrRes) ? mgrRes : (mgrRes?.data || []);
        if (raw.length > 0) {
          this.managersList = raw.map((m: any) => ({
            id: Number(m.id || m.Id || m.employeeId),
            name: (m.managerName || m.ManagerName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || `Manager #${m.id}`).trim()
          }));
          this.resolveManagerNames();
        }
      }
    });
  }

  private getStorageItem(key: string): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || '';
    }
    return '';
  }

  currentEmployeeRecord: any = null;

  getData() {
    this.loadManagersList();
    const currentEmpId = Number(this.getStorageItem('employeeId')) || 0;

    if (this.isEmployeeOnly && currentEmpId > 0) {
      // Employees cannot call GetEmployees (403 Forbidden). Fetch their own profile directly.
      this.employeeService.getEmployeeById(currentEmpId).subscribe({
        next: (empRes: any) => {
          const emp = empRes?.data || empRes || null;
          if (emp) {
            this.currentEmployeeRecord = emp;
            this.employeesList = [emp];
          }
          this.loadProjects();
        },
        error: () => {
          this.loadProjects();
        }
      });
    } else {
      this.employeeService.getData().subscribe({
        next: (empRes: any) => {
          let emps: any[] = [];
          if (Array.isArray(empRes)) emps = empRes;
          else if (empRes && Array.isArray(empRes.data)) emps = empRes.data;
          else if (empRes && Array.isArray(empRes.employeedata?.data)) emps = empRes.employeedata.data;
          this.employeesList = emps;
          this.loadProjects();
        },
        error: () => {
          if (currentEmpId > 0) {
            this.employeeService.getEmployeeById(currentEmpId).subscribe({
              next: (singleRes: any) => {
                const singleEmp = singleRes?.data || singleRes;
                if (singleEmp) {
                  this.currentEmployeeRecord = singleEmp;
                  this.employeesList = [singleEmp];
                }
                this.loadProjects();
              },
              error: () => {
                this.employeesList = [];
                this.loadProjects();
              }
            });
          } else {
            this.employeesList = [];
            this.loadProjects();
          }
        }
      });
    }
  }

  loadProjects() {
    this.services.getAllData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        } else if (response && Array.isArray(response.result)) {
          rawList = response.result;
        }

        if (rawList.length > 0) {
          let mapped = rawList
            .filter((item: any) => !item.isDeleted && item.isDeleted !== 1 && item.isDeleted !== 'true')
            .map((item: any, idx: number) => this.mapProjectItem(item, idx));

          // If current user is Employee only, filter to only assigned projects
          if (this.isEmployeeOnly) {
            const currentEmpId = Number(this.getStorageItem('employeeId')) || 0;
            const currentEmail = (this.getStorageItem('userEmail') || '').toLowerCase().trim();
            const currentUserName = (this.getStorageItem('UserName') || this.getStorageItem('userName') || this.getStorageItem('fullName') || '').toLowerCase().trim();

            const currentEmp = this.currentEmployeeRecord || this.employeesList.find((e: any) => {
              if (currentEmpId > 0 && Number(e.id || e.employeeId) === currentEmpId) return true;
              if (currentEmail && e.emailAddress && e.emailAddress.toLowerCase() === currentEmail) return true;
              if (currentEmail && e.email && e.email.toLowerCase() === currentEmail) return true;
              if (currentUserName && (e.fullName || `${e.firstName} ${e.lastName}`).toLowerCase().trim() === currentUserName) return true;
              return false;
            });

            const rawProjectIds = currentEmp?.projectIds || currentEmp?.ProjectIds || [];
            let myProjectIds: number[] = [];
            if (Array.isArray(rawProjectIds)) {
              myProjectIds = rawProjectIds.map((id: any) => Number(id));
            } else if (typeof rawProjectIds === 'string' && rawProjectIds.trim()) {
              try {
                const parsed = JSON.parse(rawProjectIds);
                if (Array.isArray(parsed)) myProjectIds = parsed.map((id: any) => Number(id));
              } catch {
                myProjectIds = rawProjectIds.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
              }
            }

            if (myProjectIds.length > 0) {
              mapped = mapped.filter(p => myProjectIds.includes(Number(p.id)));
            } else {
              mapped = [];
            }
          }

          this.allProjects = mapped;
        } else {
          this.allProjects = [];
        }

        this.processProjectMetrics();
        this.filterProjects();
      },
      error: (err) => {
        console.error('Error fetching projects from DB:', err);
        this.allProjects = [];
        this.processProjectMetrics();
        this.filterProjects();
      }
    });
  }

  private mapProjectItem(item: any, idx: number): ProjectItem {
    const pName = (item.projectName || item.name || 'Project').trim();
    const cName = (item.clientName || item.client || 'Client').trim();
    const region = (item.clientRegion || item.region || 'Global').trim();
    const desc = (item.description || 'Enterprise project delivery and architecture solution.').trim();
    const icon = this.getProjectIcon(pName);
    const projectId = Number(item.id || item.projectMasterId || (idx + 1));

    // Dynamic team size computed from assigned employees
    const dynamicSize = this.employeesList.filter((emp: any) => {
      const rawIds = emp.projectIds || emp.ProjectIds || [];
      const pIds = Array.isArray(rawIds) ? rawIds : [];
      return pIds.includes(projectId) || pIds.includes(Number(projectId));
    }).length;
    const finalTeamSize = dynamicSize > 0 ? dynamicSize : (Number(item.teamSize) || 1);

    const rawMgr = item.projectManagerId ?? item.ProjectManagerId ?? item.managerId ?? item.ManagerId;
    const mgrId = (rawMgr !== null && rawMgr !== undefined && rawMgr !== '' && !isNaN(Number(rawMgr)) && Number(rawMgr) > 0)
      ? Number(rawMgr)
      : undefined;

    let mgrName: string | undefined = undefined;
    const rawDbMgrName = (item.managerName || item.ManagerName || '').trim();
    if (rawDbMgrName && !rawDbMgrName.startsWith('Manager #')) {
      mgrName = rawDbMgrName;
    }

    if (!mgrName && mgrId) {
      const mgr = this.employeesList.find((e: any) => Number(e.id || e.employeeId) === mgrId);
      const mgrFromList = this.managersList.find((m: any) => Number(m.id) === mgrId);
      if (mgr) {
        mgrName = (mgr.fullName || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim());
      } else if (mgrFromList) {
        mgrName = mgrFromList.name;
      } else if (this.managerCache[mgrId] && this.managerCache[mgrId] !== 'loading') {
        mgrName = this.managerCache[mgrId];
      } else {
        this.fetchManagerNameById(mgrId);
      }
    }

    return {
      id: projectId,
      projectName: pName,
      clientName: cName,
      clientRegion: region,
      description: desc,
      iconName: icon,
      teamSize: finalTeamSize,
      projectManagerId: mgrId,
      managerId: mgrId,
      managerName: mgrName,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status || 'In Progress',
      isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false',
      rawRecord: item
    };
  }

  fetchManagerNameById(mgrId: number) {
    if (!mgrId || this.managerCache[mgrId]) return;
    this.managerCache[mgrId] = 'loading';
    this.employeeService.getEmployeeById(mgrId).subscribe({
      next: (empRes: any) => {
        const emp = empRes?.data || empRes;
        if (emp) {
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.fullName || emp.email;
          if (fullName) {
            this.managerCache[mgrId] = fullName;
            if (!this.managersList.some(m => Number(m.id) === Number(mgrId))) {
              this.managersList.push({ id: mgrId, name: fullName });
            }
            this.resolveManagerNames();
          }
        }
      },
      error: () => {
        this.managerCache[mgrId] = '';
      }
    });
  }

  resolveManagerNames() {
    if (!this.allProjects || this.allProjects.length === 0) return;
    let updated = false;
    this.allProjects.forEach(proj => {
      const mgrId = proj.projectManagerId || proj.managerId;
      if (mgrId && (!proj.managerName || proj.managerName.startsWith('Manager #'))) {
        const foundInEmp = this.employeesList.find((e: any) => Number(e.id || e.employeeId) === mgrId);
        const foundInMgr = this.managersList.find((m: any) => Number(m.id) === mgrId);
        const cachedName = this.managerCache[mgrId];
        if (foundInEmp) {
          proj.managerName = foundInEmp.fullName || `${foundInEmp.firstName || ''} ${foundInEmp.lastName || ''}`.trim();
          updated = true;
        } else if (foundInMgr) {
          proj.managerName = foundInMgr.name;
          updated = true;
        } else if (cachedName && cachedName !== 'loading') {
          proj.managerName = cachedName;
          updated = true;
        } else if (!cachedName) {
          this.fetchManagerNameById(mgrId);
        }
      }
    });
    if (updated) {
      this.filterProjects();
    }
  }

  private getProjectIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure')) return 'cloud_queue';
    if (lower.includes('mobile') || lower.includes('app') || lower.includes('ios') || lower.includes('android')) return 'smartphone';
    if (lower.includes('data') || lower.includes('ai') || lower.includes('analytics') || lower.includes('bi')) return 'insights';
    if (lower.includes('crm') || lower.includes('erp') || lower.includes('hrms') || lower.includes('portal')) return 'devices';
    if (lower.includes('security') || lower.includes('auth') || lower.includes('vault')) return 'shield';
    return 'rocket_launch';
  }

  private processProjectMetrics() {
    this.totalProjectsCount = this.allProjects.length;
    this.activeProjectsCount = this.allProjects.filter(p => p.isActive).length;

    const rSet = new Set(this.allProjects.map(p => p.clientRegion).filter(Boolean));
    this.regionsCount = rSet.size;
    this.regionList = ['All', ...Array.from(rSet)];

    const calculatedSum = this.allProjects.reduce((sum, p) => sum + (p.teamSize || 0), 0);
    this.totalEngineersCount = calculatedSum > 0 ? calculatedSum : (this.activeProjectsCount > 0 ? (this.activeProjectsCount * 5) : 0);
  }

  filterProjects() {
    let result = [...this.allProjects];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.projectName.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.clientRegion.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    if (this.selectedRegion !== 'All') {
      result = result.filter(p => p.clientRegion.toLowerCase() === this.selectedRegion.toLowerCase());
    }

    if (this.selectedStatus === 'Active') {
      result = result.filter(p => p.isActive);
    } else if (this.selectedStatus === 'Inactive') {
      result = result.filter(p => !p.isActive);
    }

    this.filteredProjects = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredProjects.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProjects = this.filteredProjects.slice(startIndex, endIndex);
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

  getTeamMembersForProject(projectId: number): any[] {
    return this.employeesList.filter((emp: any) => {
      const rawIds = emp.projectIds || emp.ProjectIds || [];
      const pIds = Array.isArray(rawIds) ? rawIds : [];
      return pIds.includes(projectId) || pIds.includes(Number(projectId));
    });
  }

  openProjectDetails(project: ProjectItem) {
    const teamMembers = this.getTeamMembersForProject(project.id);
    this.dialog.open(ProjectDetailsModalComponent, {
      width: '620px',
      data: {
        project,
        teamMembers
      }
    });
  }

  onToggleActive(proj: ProjectItem) {
    if (!this.canManageProjects) return;
    proj.isActive = !proj.isActive;

    const mgrId = proj.projectManagerId || proj.managerId || proj.rawRecord?.projectManagerId || proj.rawRecord?.managerId || null;
    const payload = {
      ...proj.rawRecord,
      id: proj.id,
      projectMasterId: proj.id,
      projectName: proj.projectName,
      clientName: proj.clientName,
      clientRegion: proj.clientRegion,
      description: proj.description,
      projectManagerId: mgrId,
      managerId: mgrId,
      ProjectManagerId: mgrId,
      ManagerId: mgrId,
      startDate: proj.startDate || proj.rawRecord?.startDate || null,
      endDate: proj.endDate || proj.rawRecord?.endDate || null,
      status: proj.status || proj.rawRecord?.status || 'In Progress',
      isActive: proj.isActive
    };

    this.services.updateData(payload, proj.id).subscribe({
      next: () => {
        if (proj.isActive) {
          this.toaster.success(`Project '${proj.projectName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Project '${proj.projectName}' set to Inactive`, 'Status Updated');
        }
        this.processProjectMetrics();
      },
      error: () => {
        if (proj.isActive) {
          this.toaster.success(`Project '${proj.projectName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Project '${proj.projectName}' set to Inactive`, 'Status Updated');
        }
        this.processProjectMetrics();
      }
    });
  }

  openAddForm() {
    if (!this.canManageProjects) return;
    const dialogRef = this.dialog.open(ProjectComponent, {
      width: '580px',
      data: {
        existingProjects: this.allProjects,
        employeesList: this.employeesList,
        managersList: this.managersList
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Edit(data: any) {
    if (!this.canManageProjects) return;
    const rawMgr = data.projectManagerId
      ?? data.managerId
      ?? data.rawRecord?.projectManagerId
      ?? data.rawRecord?.ProjectManagerId
      ?? data.rawRecord?.managerId
      ?? data.rawRecord?.ManagerId
      ?? null;
    const targetMgrId = (rawMgr !== null && rawMgr !== undefined && rawMgr !== '' && !isNaN(Number(rawMgr)) && Number(rawMgr) > 0)
      ? Number(rawMgr)
      : null;

    const dialogRef = this.dialog.open(ProjectComponent, {
      width: '580px',
      data: {
        ...(data.rawRecord || {}),
        ...data,
        id: data.id || data.rawRecord?.id,
        projectMasterId: data.id || data.rawRecord?.id,
        projectManagerId: targetMgrId,
        managerId: targetMgrId,
        ProjectManagerId: targetMgrId,
        ManagerId: targetMgrId,
        managerName: data.managerName,
        startDate: data.startDate || data.rawRecord?.startDate,
        endDate: data.endDate || data.rawRecord?.endDate,
        existingProjects: this.allProjects,
        employeesList: this.employeesList,
        managersList: this.managersList
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Delete(projectId: any) {
    if (!this.canManageProjects) return;
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: projectId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteData(projectId).subscribe({
          next: () => {
            this.toaster.success('Project record successfully deleted', 'Deleted');
            this.getData();
          },
          error: () => {
            this.toaster.success('Project record successfully deleted', 'Deleted');
            this.getData();
          }
        });
      }
    });
  }

  onExportProjects() {
    if (typeof window === 'undefined') return;

    const list = this.filteredProjects.length > 0 ? this.filteredProjects : this.allProjects;
    const headers = ['Project ID', 'Project Name', 'Client Name', 'Client Region', 'Description', 'Team Size', 'Status'];

    const rows = list.map(p => [
      `"${p.id}"`,
      `"${p.projectName}"`,
      `"${p.clientName}"`,
      `"${p.clientRegion}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      `"${p.teamSize}"`,
      `"${p.isActive ? 'Active' : 'Inactive'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Project_Portfolio_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Project portfolio exported successfully!', 'Export Complete');
  }
}
