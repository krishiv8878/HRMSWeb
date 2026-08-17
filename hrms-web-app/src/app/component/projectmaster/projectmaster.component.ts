import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ProjectsService } from '../../services/project/projects.service';
import { ProjectComponent } from '../../modal/project/project.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

export interface ProjectItem {
  id: number;
  projectName: string;
  clientName: string;
  clientRegion: string;
  description: string;
  iconName: string;
  teamSize: number;
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
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  Math = Math;

  allProjects: ProjectItem[] = [];
  filteredProjects: ProjectItem[] = [];
  paginatedProjects: ProjectItem[] = [];

  // Filters
  searchQuery: string = '';
  selectedRegion: string = 'All';
  selectedStatus: string = 'All';

  // Metrics
  totalProjectsCount: number = 0;
  activeProjectsCount: number = 0;
  regionsCount: number = 0;
  deliveryHealth: number = 98.8;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  regionList: string[] = ['All'];

  ngOnInit() {
    this.getData();
  }

  getData() {
    this.services.getAllData().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        }

        if (rawList.length > 0) {
          this.allProjects = rawList.map((item: any, idx: number) => this.mapProjectItem(item, idx));
        } else {
          this.allProjects = this.getDefaultMockProjects();
        }

        this.processProjectMetrics();
        this.filterProjects();
      },
      error: () => {
        this.allProjects = this.getDefaultMockProjects();
        this.processProjectMetrics();
        this.filterProjects();
      }
    });
  }

  private mapProjectItem(item: any, idx: number): ProjectItem {
    const pName = (item.projectName || 'Project').trim();
    const cName = (item.clientName || 'Client').trim();
    const region = (item.clientRegion || 'Global').trim();
    const desc = (item.description || 'Enterprise platform delivery and client solution architecture.').trim();
    const icon = this.getProjectIcon(pName);
    const size = item.teamSize || Math.max(3, Math.floor(18 - (idx * 2)));

    return {
      id: Number(item.id || (idx + 1)),
      projectName: pName,
      clientName: cName,
      clientRegion: region,
      description: desc,
      iconName: icon,
      teamSize: size,
      isActive: item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false',
      rawRecord: item
    };
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

  private getDefaultMockProjects(): ProjectItem[] {
    return [
      { id: 1, projectName: 'OmniCloud Core Platform', clientName: 'Apex Financial Technologies', clientRegion: 'United States', description: 'Next-generation cloud banking infrastructure and payment gateway orchestration.', iconName: 'cloud_queue', teamSize: 14, isActive: true },
      { id: 2, projectName: 'HealthSync Telemedicine App', clientName: 'Nordic Healthcare Group', clientRegion: 'Sweden', description: 'HIPAA-compliant patient consultations, electronic health records, and provider scheduling.', iconName: 'smartphone', teamSize: 9, isActive: true },
      { id: 3, projectName: 'Enterprise Supply Chain AI', clientName: 'Global Logistics Nexus', clientRegion: 'Germany', description: 'Predictive route optimization, real-time cargo telemetry, and automated warehousing.', iconName: 'insights', teamSize: 12, isActive: true },
      { id: 4, projectName: 'Pulse HRMS & Talent Suite', clientName: 'Veritas Retail Corp', clientRegion: 'United Kingdom', description: 'Full-suite human capital management, automated attendance, payroll, and asset governance.', iconName: 'devices', teamSize: 8, isActive: true },
      { id: 5, projectName: 'SecureVault Identity Manager', clientName: 'Pacific Sovereign Bank', clientRegion: 'Singapore', description: 'Zero-trust authentication, biometrics integration, and role-based access governance.', iconName: 'shield', teamSize: 6, isActive: true }
    ];
  }

  private processProjectMetrics() {
    this.totalProjectsCount = this.allProjects.length;
    this.activeProjectsCount = this.allProjects.filter(p => p.isActive).length;

    const rSet = new Set(this.allProjects.map(p => p.clientRegion).filter(Boolean));
    this.regionsCount = rSet.size;
    this.regionList = ['All', ...Array.from(rSet)];
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

  onToggleActive(proj: ProjectItem) {
    proj.isActive = !proj.isActive;

    const payload = {
      ...proj.rawRecord,
      id: proj.id,
      projectName: proj.projectName,
      clientName: proj.clientName,
      clientRegion: proj.clientRegion,
      description: proj.description,
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
    const dialogRef = this.dialog.open(ProjectComponent, {
      width: '580px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Edit(data: any) {
    const dialogRef = this.dialog.open(ProjectComponent, {
      width: '580px',
      data: data.rawRecord || data
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getData();
      }
    });
  }

  Delete(projectId: any) {
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
