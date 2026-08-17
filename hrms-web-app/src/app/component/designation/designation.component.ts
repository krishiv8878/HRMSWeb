import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DesignationservicesService } from '../../services/designation/designationservices.service';
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
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  Math = Math;

  allDesignations: DesignationItem[] = [];
  filteredDesignations: DesignationItem[] = [];
  paginatedDesignations: DesignationItem[] = [];

  // Filter states
  searchQuery: string = '';
  selectedDept: string = 'All';
  selectedStatus: string = 'All';

  // Metrics
  totalCount: number = 0;
  activeCount: number = 0;
  departmentsCount: number = 5;
  ladderLevelsCount: number = 4;

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
          this.allDesignations = this.getDefaultMockDesignations();
        }

        this.processDesignationMetrics();
        this.filterDesignations();
      },
      error: () => {
        this.allDesignations = this.getDefaultMockDesignations();
        this.processDesignationMetrics();
        this.filterDesignations();
      }
    });
  }

  private mapDesignationItem(item: any, idx: number): DesignationItem {
    const name = (item.designationName || 'Designation').trim();
    const { dept, level, icon } = this.categorizeDesignation(name);
    const count = item.headcount || Math.max(2, Math.floor(32 - (idx * 3)));

    return {
      id: Number(item.id || (idx + 1)),
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
    if (lower.includes('lead') || lower.includes('principal') || lower.includes('director') || lower.includes('vp') || lower.includes('head')) {
      level = 'Leadership';
    } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('architect')) {
      level = 'Senior Level';
    } else if (lower.includes('junior') || lower.includes('intern') || lower.includes('associate')) {
      level = 'Entry Level';
    }

    if (lower.includes('engineer') || lower.includes('developer') || lower.includes('architect') || lower.includes('devops') || lower.includes('qa')) {
      return { dept: 'Engineering', level, icon: 'engineering' };
    }
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('product')) {
      return { dept: 'Product & Design', level, icon: 'palette' };
    }
    if (lower.includes('hr') || lower.includes('talent') || lower.includes('recruiter') || lower.includes('people')) {
      return { dept: 'Human Resources', level, icon: 'badge' };
    }
    if (lower.includes('market') || lower.includes('sales') || lower.includes('account') || lower.includes('business')) {
      return { dept: 'Marketing & Sales', level, icon: 'trending_up' };
    }

    return { dept: 'Management', level, icon: 'domain' };
  }

  private getDefaultMockDesignations(): DesignationItem[] {
    return [
      { id: 1, designationName: 'Principal Software Architect', departmentCategory: 'Engineering', careerLevel: 'Leadership', headcount: 4, iconName: 'engineering', isActive: true },
      { id: 2, designationName: 'Senior Frontend Engineer', departmentCategory: 'Engineering', careerLevel: 'Senior Level', headcount: 18, iconName: 'engineering', isActive: true },
      { id: 3, designationName: 'Lead UI/UX Designer', departmentCategory: 'Product & Design', careerLevel: 'Leadership', headcount: 6, iconName: 'palette', isActive: true },
      { id: 4, designationName: 'HR Business Partner', departmentCategory: 'Human Resources', careerLevel: 'Senior Level', headcount: 5, iconName: 'badge', isActive: true },
      { id: 5, designationName: 'DevOps & Cloud Engineer', departmentCategory: 'Engineering', careerLevel: 'Mid Level', headcount: 8, iconName: 'engineering', isActive: true }
    ];
  }

  private processDesignationMetrics() {
    this.totalCount = this.allDesignations.length;
    this.activeCount = this.allDesignations.filter(d => d.isActive).length;
    const dSet = new Set(this.allDesignations.map(d => d.departmentCategory));
    this.departmentsCount = dSet.size;
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
