import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  CompanyPolicyService,
  PolicyAcknowledgement,
  PolicyComplianceSummaryDto,
  PolicyDto
} from '../../services/company-policy/company-policy.service';
import { RbacService } from '../../core/rbac.service';

@Component({
  selector: 'app-company-policy',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './company-policy.component.html',
  styleUrls: ['./company-policy.component.scss']
})
export class CompanyPolicyComponent implements OnInit {
  private policyService = inject(CompanyPolicyService);
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);

  policies: PolicyDto[] = [];
  filteredPolicies: PolicyDto[] = [];
  complianceSummary: PolicyComplianceSummaryDto | null = null;
  isLoading = false;

  // Filters
  categoryFilter = 'All';
  searchQuery = '';

  // Modals
  selectedPolicy: PolicyDto | null = null;
  showReadModal = false;
  showCreateEditModal = false;
  showAcksModal = false;
  acknowledgementsList: PolicyAcknowledgement[] = [];
  isEditing = false;

  policyForm = {
    id: 0,
    title: '',
    category: 'Code of Conduct',
    contentHtml: '',
    requiresAcknowledgement: true,
    effectiveDate: new Date().toISOString().substring(0, 10),
    bumpVersion: false
  };

  get canManagePolicies(): boolean {
    return this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);
  }

  ngOnInit(): void {
    this.loadPolicies();
    if (this.canManagePolicies) {
      this.loadComplianceSummary();
    }
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.policyService.getAll(this.categoryFilter).subscribe({
      next: (res: any) => {
        this.policies = res?.data || [];
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load company policies');
        this.isLoading = false;
      }
    });
  }

  loadComplianceSummary(): void {
    this.policyService.getComplianceSummary().subscribe({
      next: (res: any) => {
        this.complianceSummary = res?.data || null;
      },
      error: () => {
        // silent fail
      }
    });
  }

  applyFilter(): void {
    this.filteredPolicies = this.policies.filter(p => {
      const matchCategory = this.categoryFilter === 'All' || p.category === this.categoryFilter;
      const matchSearch = !this.searchQuery.trim() ||
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }

  onFilterChange(): void {
    this.loadPolicies();
  }

  openReadModal(policy: PolicyDto): void {
    this.selectedPolicy = policy;
    this.showReadModal = true;
  }

  closeReadModal(): void {
    this.showReadModal = false;
    this.selectedPolicy = null;
  }

  acknowledgePolicy(policy: PolicyDto): void {
    this.policyService.acknowledge(policy.id, policy.version).subscribe({
      next: () => {
        this.toastr.success(`Acknowledged: ${policy.title}`);
        policy.isAcknowledgedByCurrentUser = true;
        policy.currentUserAcknowledgedAt = new Date().toISOString();
        if (this.canManagePolicies) {
          this.loadComplianceSummary();
        }
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to record acknowledgement');
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.policyForm = {
      id: 0,
      title: '',
      category: 'Code of Conduct',
      contentHtml: '',
      requiresAcknowledgement: true,
      effectiveDate: new Date().toISOString().substring(0, 10),
      bumpVersion: false
    };
    this.showCreateEditModal = true;
  }

  openEditModal(policy: PolicyDto, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditing = true;
    this.policyForm = {
      id: policy.id,
      title: policy.title,
      category: policy.category,
      contentHtml: policy.contentHtml,
      requiresAcknowledgement: policy.requiresAcknowledgement,
      effectiveDate: policy.effectiveDate ? policy.effectiveDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      bumpVersion: false
    };
    this.showCreateEditModal = true;
  }

  closeCreateEditModal(): void {
    this.showCreateEditModal = false;
  }

  savePolicy(): void {
    if (!this.policyForm.title.trim() || !this.policyForm.contentHtml.trim()) {
      this.toastr.warning('Please enter Title and Policy Content');
      return;
    }

    if (this.isEditing) {
      this.policyService.update({
        id: this.policyForm.id,
        title: this.policyForm.title.trim(),
        category: this.policyForm.category,
        contentHtml: this.policyForm.contentHtml,
        requiresAcknowledgement: this.policyForm.requiresAcknowledgement,
        effectiveDate: this.policyForm.effectiveDate,
        isActive: true,
        bumpVersion: this.policyForm.bumpVersion
      }).subscribe({
        next: () => {
          this.toastr.success('Policy updated successfully');
          this.closeCreateEditModal();
          this.loadPolicies();
          this.loadComplianceSummary();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Failed to update policy');
        }
      });
    } else {
      this.policyService.create({
        title: this.policyForm.title.trim(),
        category: this.policyForm.category,
        contentHtml: this.policyForm.contentHtml,
        requiresAcknowledgement: this.policyForm.requiresAcknowledgement,
        effectiveDate: this.policyForm.effectiveDate
      }).subscribe({
        next: () => {
          this.toastr.success('Policy published successfully');
          this.closeCreateEditModal();
          this.loadPolicies();
          this.loadComplianceSummary();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Failed to publish policy');
        }
      });
    }
  }

  viewAcknowledgements(policy: PolicyDto, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedPolicy = policy;
    this.policyService.getAcknowledgements(policy.id).subscribe({
      next: (res: any) => {
        this.acknowledgementsList = res?.data || [];
        this.showAcksModal = true;
      },
      error: () => {
        this.toastr.error('Failed to load acknowledgements');
      }
    });
  }

  closeAcksModal(): void {
    this.showAcksModal = false;
    this.acknowledgementsList = [];
    this.selectedPolicy = null;
  }
}
