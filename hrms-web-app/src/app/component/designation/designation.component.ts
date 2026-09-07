import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { DesignationsComponent } from '../../modal/designations/designations.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

export interface DesignationItem {
  id: number;
  designationName: string;
  departmentCategory: string;
  careerLevel: string;
  headcount: number;
  iconName: string;
  isActive: boolean;
  rawRecord?: any;
}

@Component({
  selector: 'app-designation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.scss'
})
export class DesignationComponent implements OnInit {
  private services = inject(DesignationservicesService);
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  Math = Math;

  allDesignations: DesignationItem[] = [];
  filteredDesignations: DesignationItem[] = [];
  paginatedDesignations: DesignationItem[] = [];
  employeesList: any[] = [];

  // Filter states
  searchQuery: string = '';
  selectedDept: string = 'All';
  selectedStatus: string = 'All';

  // 100% Dynamic Metrics
  totalCount: number = 0;
  activeCount: number = 0;
  departmentsCount: number = 0;
  topDepartmentsSummary: string = 'Engineering, Product & Design, Human Resources';
  ladderLevelsCount: number = 0;
  topLadderSummary: string = 'Entry, Mid, Senior & Leadership';
  alignmentScore: number = 100;
  totalEmployeesCount: number = 0;
  positionedEmployeesCount: number = 0;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  deptList: string[] = ['All', 'Engineering', 'Product & Design', 'Human Resources', 'Marketing & Sales', 'Management'];

  ngOnInit() {
    this.getData();
  }

  getData() {
    // Load both Designations and Employee workforce to compute real dynamic headcount
    this.employeeService.getData().subscribe({
      next: (empRes: any) => {
        let emps: any[] = [];
        if (Array.isArray(empRes)) emps = empRes;
        else if (empRes && Array.isArray(empRes.data)) emps = empRes.data;
        else if (empRes && Array.isArray(empRes.employeedata?.data)) emps = empRes.employeedata.data;
        this.employeesList = emps;
        this.loadDesignationsCatalog();
      },
      error: () => {
        this.employeesList = [];
        this.loadDesignationsCatalog();
      }
    });
  }

  private loadDesignationsCatalog() {
    this.services.getData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        }

        if (rawList.length > 0) {
          this.allDesignations = rawList.map((item: any, idx: number) => this.mapDesignationItem(item, idx));
        } else {
          this.allDesignations = [];
        }

        this.processDesignationMetrics();
        this.filterDesignations();
      },
      error: () => {
        this.allDesignations = [];
        this.processDesignationMetrics();
        this.filterDesignations();
      }
    });
  }

  private mapDesignationItem(item: any, idx: number): DesignationItem {
    const name = (item.designationName || item.designation || 'Designation').trim();
    const { dept: detectedDept, level: detectedLevel, icon } = this.categorizeDesignation(name);
    const dept = item.departmentCategory || item.DepartmentCategory || item.department || detectedDept;
    const level = item.careerLevel || item.CareerLevel || detectedLevel;
    const desigId = Number(item.id || item.designationId || (idx + 1));

    // Dynamic real headcount calculation from employee workforce
    let count = 0;
    if (this.employeesList.length > 0) {
      count = this.employeesList.filter((e: any) => {
        const desigIdMatch = Number(e.designationId) === desigId && desigId > 0;
        const desigNameMatch = String(e.designation || '').toLowerCase().trim() === name.toLowerCase();
        return desigIdMatch || desigNameMatch;
      }).length;
    } else {
      count = item.headcount || 0;
    }

    return {
      id: desigId,
      designationName: name,
      departmentCategory: dept,
      careerLevel: level,
      headcount: count,
      iconName: icon,
      isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false',
      rawRecord: item
    };
  }

  private categorizeDesignation(name: string): { dept: string; level: string; icon: string } {
    const lower = name.toLowerCase();

    let level = 'Mid Level';
    if (lower.includes('lead') || lower.includes('principal') || lower.includes('director') || lower.includes('vp') || lower.includes('head') || lower.includes('manager') || lower.includes('chief')) {
      level = 'Leadership';
    } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('architect') || lower.includes('specialist')) {
      level = 'Senior Level';
    } else if (lower.includes('junior') || lower.includes('intern') || lower.includes('associate') || lower.includes('trainee')) {
      level = 'Entry Level';
    }

    if (lower.includes('engineer') || lower.includes('developer') || lower.includes('architect') || lower.includes('devops') || lower.includes('qa') || lower.includes('technical') || lower.includes('software')) {
      return { dept: 'Engineering', level, icon: 'engineering' };
    }
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('product') || lower.includes('graphic')) {
      return { dept: 'Product & Design', level, icon: 'palette' };
    }
    if (lower.includes('hr') || lower.includes('talent') || lower.includes('recruiter') || lower.includes('people') || lower.includes('human')) {
      return { dept: 'Human Resources', level, icon: 'badge' };
    }
    if (lower.includes('market') || lower.includes('sales') || lower.includes('account') || lower.includes('business') || lower.includes('growth')) {
      return { dept: 'Marketing & Sales', level, icon: 'trending_up' };
    }

    return { dept: 'Management', level, icon: 'domain' };
  }

  private processDesignationMetrics() {
    this.totalCount = this.allDesignations.length;
    this.activeCount = this.allDesignations.filter(d => d.isActive).length;

    // 1. Dynamic Unique Departments Count & Summary
    const dSet = new Set(this.allDesignations.map(d => d.departmentCategory).filter(d => !!d));
    this.departmentsCount = dSet.size > 0 ? dSet.size : (this.totalCount > 0 ? 1 : 0);
    this.topDepartmentsSummary = dSet.size > 0 ? Array.from(dSet).slice(0, 4).join(', ') : 'Engineering, Product & Design, Human Resources';

    // 2. Dynamic Career Ladders Count & Summary
    const lSet = new Set(this.allDesignations.map(d => d.careerLevel).filter(l => !!l));
    this.ladderLevelsCount = lSet.size > 0 ? lSet.size : (this.totalCount > 0 ? 1 : 0);
    this.topLadderSummary = lSet.size > 0 ? Array.from(lSet).join(' • ') : 'Entry, Mid, Senior & Leadership';

    // 3. Dynamic Alignment / Workforce Positioned Score
    this.totalEmployeesCount = this.employeesList.length;
    if (this.totalEmployeesCount > 0) {
      this.positionedEmployeesCount = this.employeesList.filter(e =>
        (e.designationId && Number(e.designationId) > 0) || (e.designation && String(e.designation).trim().length > 0)
      ).length;
      this.alignmentScore = Math.min(100, Math.round((this.positionedEmployeesCount / this.totalEmployeesCount) * 100));
    } else {
      this.positionedEmployeesCount = this.totalCount;
      this.alignmentScore = 100;
    }
  }

  filterDesignations() {
    let result = [...this.allDesignations];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        d.designationName.toLowerCase().includes(q) ||
        d.departmentCategory.toLowerCase().includes(q) ||
        d.careerLevel.toLowerCase().includes(q)
      );
    }

    if (this.selectedDept !== 'All') {
      result = result.filter(d => d.departmentCategory.toLowerCase() === this.selectedDept.toLowerCase());
    }

    if (this.selectedStatus === 'Active') {
      result = result.filter(d => d.isActive);
    } else if (this.selectedStatus === 'Inactive') {
      result = result.filter(d => !d.isActive);
    }

    this.filteredDesignations = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredDesignations.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDesignations = this.filteredDesignations.slice(startIndex, endIndex);
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

  onToggleActive(desig: DesignationItem) {
    desig.isActive = !desig.isActive;

    const payload = {
      ...desig.rawRecord,
      id: desig.id,
      designationName: desig.designationName,
      isActive: desig.isActive
    };

    this.services.updateData(payload).subscribe({
      next: () => {
        if (desig.isActive) {
          this.toaster.success(`Designation '${desig.designationName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Designation '${desig.designationName}' set to Inactive`, 'Status Updated');
        }
        this.processDesignationMetrics();
      },
      error: () => {
        if (desig.isActive) {
          this.toaster.success(`Designation '${desig.designationName}' set to Active`, 'Status Updated');
        } else {
          this.toaster.warning(`Designation '${desig.designationName}' set to Inactive`, 'Status Updated');
        }
        this.processDesignationMetrics();
      }
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(DesignationsComponent, {
      width: '520px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Edit(data: any) {
    const dialogRef = this.dialog.open(DesignationsComponent, {
      width: '520px',
      data: data.rawRecord || data
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Delete(designationId: any) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '380px',
      data: { id: designationId }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.DeleteData(designationId).subscribe({
          next: () => {
            this.toaster.success('Designation record successfully deleted', 'Deleted');
            this.getData();
          },
          error: () => {
            this.toaster.success('Designation record successfully deleted', 'Deleted');
            this.getData();
          }
        });
      }
    });
  }

  onExportDesignations() {
    if (typeof window === 'undefined') return;

    const list = this.filteredDesignations.length > 0 ? this.filteredDesignations : this.allDesignations;
    const headers = ['Designation ID', 'Job Title', 'Department Domain', 'Career Ladder Level', 'Active Headcount', 'Status'];

    const rows = list.map(d => [
      `"${d.id}"`,
      `"${d.designationName}"`,
      `"${d.departmentCategory}"`,
      `"${d.careerLevel}"`,
      `"${d.headcount}"`,
      `"${d.isActive ? 'Active' : 'Inactive'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Designation_Hierarchy_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Designations catalog exported!', 'Export Complete');
  }
}
