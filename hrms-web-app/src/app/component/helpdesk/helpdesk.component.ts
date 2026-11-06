import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { HelpdeskMetrics, HelpdeskService, HelpdeskTicket, HelpdeskTicketActivity, SupportAgent } from '../../services/helpdesk/helpdesk.service';
import { RbacService } from '../../core/rbac.service';

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './helpdesk.component.html',
  styleUrls: ['./helpdesk.component.scss']
})
export class HelpdeskComponent implements OnInit {
  private helpdeskService = inject(HelpdeskService);
  private toastr = inject(ToastrService);
  public rbacService = inject(RbacService);

  tickets: HelpdeskTicket[] = [];
  filteredTickets: HelpdeskTicket[] = [];
  metrics: HelpdeskMetrics | null = null;
  supportAgents: SupportAgent[] = [];
  isLoading = false;

  // Queue Tabs: 'my-tickets', 'assigned-to-me', 'unassigned', 'all'
  activeQueueTab: 'my-tickets' | 'assigned-to-me' | 'unassigned' | 'all' = 'my-tickets';

  // Filters
  statusFilter = 'All';
  categoryFilter = 'All';
  priorityFilter = 'All';
  searchQuery = '';

  // New Ticket Modal State
  showCreateModal = false;
  newTicket = {
    subject: '',
    category: 'IT Support',
    priority: 'Medium',
    description: '',
    assignedToEmployeeId: 0
  };

  // Ticket Detail Modal State
  selectedTicket: HelpdeskTicket | null = null;
  showDetailModal = false;
  isLoadingDetails = false;

  // Status Update in Modal (Agent / Admin)
  updateStatusPayload = {
    status: '',
    resolutionNotes: ''
  };

  // Assignment in Modal
  showAssignForm = false;
  assignPayload = {
    assignToEmployeeId: 0,
    assignmentNotes: ''
  };

  // Comment Thread in Modal
  newCommentText = '';
  isPostingComment = false;

  get currentUserId(): number {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('employeeId');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  }

  get isAdminOrHr(): boolean {
    return this.rbacService.isAdmin() || this.rbacService.isHR();
  }

  get canAssign(): boolean {
    if (!this.selectedTicket) return false;
    const isNotTerminal = this.selectedTicket.status !== 'Closed' && this.selectedTicket.status !== 'Cancelled';
    return isNotTerminal && (this.rbacService.isAdmin() || this.rbacService.isHR() || this.rbacService.isManager() || !!this.selectedTicket?.canCurrentUserAssign);
  }

  get canClaim(): boolean {
    if (!this.selectedTicket) return false;
    const isUnassigned = !this.selectedTicket.assignedToEmployeeId || this.selectedTicket.assignedToEmployeeId === 0;
    const isNotClosed = this.selectedTicket.status !== 'Closed' && this.selectedTicket.status !== 'Cancelled';
    return isUnassigned && isNotClosed && (this.rbacService.isAdmin() || this.rbacService.isHR() || this.rbacService.isManager() || !!this.selectedTicket.canCurrentUserClaim);
  }

  get isAssignedAgent(): boolean {
    return !!this.selectedTicket?.assignedToEmployeeId && this.selectedTicket.assignedToEmployeeId === this.currentUserId;
  }

  get isAgentOrAdmin(): boolean {
    if (!this.selectedTicket) return false;
    if (this.rbacService.isAdmin()) return true;
    return this.isAssignedAgent;
  }

  get canAgentUpdateStatus(): boolean {
    if (!this.selectedTicket) return false;
    const isTerminalOrResolved = this.selectedTicket.status === 'Closed' ||
                                 this.selectedTicket.status === 'Cancelled' ||
                                 this.selectedTicket.status === 'Resolved';
    if (this.rbacService.isAdmin()) {
      return this.selectedTicket.status !== 'Cancelled';
    }
    return this.isAssignedAgent && !isTerminalOrResolved;
  }

  get isRequester(): boolean {
    return !!this.selectedTicket && this.selectedTicket.requesterEmployeeId === this.currentUserId;
  }

  ngOnInit(): void {
    if (this.isAdminOrHr || this.rbacService.isManager()) {
      this.activeQueueTab = 'all';
    } else {
      this.activeQueueTab = 'my-tickets';
    }
    this.loadTickets();
    this.loadMetrics();
    this.loadSupportAgents();
  }

  setQueueTab(tab: 'my-tickets' | 'assigned-to-me' | 'unassigned' | 'all'): void {
    this.activeQueueTab = tab;
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading = true;

    let requesterId: number | undefined = undefined;
    let assigneeId: number | undefined = undefined;

    if (this.activeQueueTab === 'my-tickets') {
      requesterId = this.currentUserId;
    } else if (this.activeQueueTab === 'assigned-to-me') {
      assigneeId = this.currentUserId;
    } else if (this.activeQueueTab === 'unassigned') {
      assigneeId = -1;
    }

    this.helpdeskService.getTickets(
      this.statusFilter,
      this.categoryFilter,
      this.priorityFilter,
      requesterId,
      assigneeId
    ).subscribe({
      next: (res: any) => {
        this.tickets = res?.data || [];
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load helpdesk tickets');
        this.isLoading = false;
      }
    });
  }

  loadMetrics(): void {
    this.helpdeskService.getMetrics(this.categoryFilter).subscribe({
      next: (res: any) => {
        this.metrics = res?.data || null;
      },
      error: () => {
        // silent fail on metrics
      }
    });
  }

  loadSupportAgents(): void {
    this.helpdeskService.getSupportAgents().subscribe({
      next: (res: any) => {
        this.supportAgents = res?.data || [];
      },
      error: () => {}
    });
  }

  applyFilter(): void {
    this.filteredTickets = this.tickets.filter(t => {
      const matchStatus = this.statusFilter === 'All' || t.status.toLowerCase() === this.statusFilter.toLowerCase();
      const matchCategory = this.categoryFilter === 'All' || t.departmentCategory === this.categoryFilter;
      const matchPriority = this.priorityFilter === 'All' || t.priority === this.priorityFilter;
      const matchSearch = !this.searchQuery.trim() ||
        t.ticketNumber.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (t.requesterName && t.requesterName.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(this.searchQuery.toLowerCase()));
      return matchStatus && matchCategory && matchPriority && matchSearch;
    });
  }

  onFilterChange(): void {
    this.loadTickets();
    this.loadMetrics();
  }

  openCreateModal(): void {
    this.newTicket = {
      subject: '',
      category: 'IT Support',
      priority: 'Medium',
      description: '',
      assignedToEmployeeId: 0
    };
    if (this.supportAgents.length === 0) {
      this.loadSupportAgents();
    }
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitNewTicket(): void {
    if (!this.newTicket.subject.trim() || !this.newTicket.description.trim()) {
      this.toastr.warning('Please fill in subject and description');
      return;
    }

    const payload: any = {
      subject: this.newTicket.subject.trim(),
      description: this.newTicket.description.trim(),
      departmentCategory: this.newTicket.category,
      priority: this.newTicket.priority
    };

    if (this.newTicket.assignedToEmployeeId > 0) {
      payload.assignedToEmployeeId = this.newTicket.assignedToEmployeeId;
    }

    this.helpdeskService.createTicket(payload).subscribe({
      next: () => {
        this.toastr.success('Ticket submitted successfully');
        this.closeCreateModal();
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to submit ticket');
      }
    });
  }

  openTicketDetails(ticket: HelpdeskTicket, openAssignDrawer: boolean = false): void {
    this.selectedTicket = ticket;
    this.updateStatusPayload = {
      status: ticket.status === 'Open' ? 'In Progress' : ticket.status,
      resolutionNotes: ticket.resolutionNotes || ''
    };
    this.showAssignForm = openAssignDrawer;
    this.assignPayload = {
      assignToEmployeeId: ticket.assignedToEmployeeId || 0,
      assignmentNotes: ''
    };
    this.newCommentText = '';
    this.showDetailModal = true;
    this.isLoadingDetails = true;

    if (this.supportAgents.length === 0) {
      this.loadSupportAgents();
    }

    // Fetch full ticket details including fresh activities and permission flags
    this.helpdeskService.getTicketById(ticket.id).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.selectedTicket = res.data;
          this.updateStatusPayload.status = res.data.status === 'Open' ? 'In Progress' : res.data.status;
          this.updateStatusPayload.resolutionNotes = res.data.resolutionNotes || '';
          this.assignPayload.assignToEmployeeId = res.data.assignedToEmployeeId || 0;
        }
        this.isLoadingDetails = false;
      },
      error: () => {
        this.isLoadingDetails = false;
      }
    });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTicket = null;
    this.showAssignForm = false;
  }

  toggleAssignForm(): void {
    this.showAssignForm = !this.showAssignForm;
    if (this.showAssignForm && this.supportAgents.length === 0) {
      this.loadSupportAgents();
    }
  }

  claimTicket(ticketId?: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const targetId = ticketId || this.selectedTicket?.id;
    if (!targetId) return;

    this.helpdeskService.claimTicket(targetId).subscribe({
      next: (res: any) => {
        this.toastr.success('Ticket claimed successfully. You are now the assigned support agent.');
        if (this.selectedTicket && this.selectedTicket.id === targetId) {
          this.selectedTicket = res.data;
          this.updateStatusPayload.status = res.data.status;
        }
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to claim ticket');
      }
    });
  }

  saveAssignment(): void {
    if (!this.selectedTicket || !this.assignPayload.assignToEmployeeId) {
      this.toastr.warning('Please select an agent to assign the ticket to.');
      return;
    }

    this.helpdeskService.assignTicket({
      ticketId: this.selectedTicket.id,
      assignToEmployeeId: Number(this.assignPayload.assignToEmployeeId),
      assignmentNotes: this.assignPayload.assignmentNotes
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(`Ticket assigned to ${res.data.assigneeName} successfully.`);
        this.selectedTicket = res.data;
        this.showAssignForm = false;
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to assign ticket');
      }
    });
  }

  saveTicketStatus(): void {
    if (!this.selectedTicket) return;

    if (this.updateStatusPayload.status === this.selectedTicket.status && !this.updateStatusPayload.resolutionNotes.trim()) {
      this.toastr.info('No status change detected.');
      return;
    }

    this.helpdeskService.updateTicketStatus({
      ticketId: this.selectedTicket.id,
      status: this.updateStatusPayload.status,
      resolutionNotes: this.updateStatusPayload.resolutionNotes
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(`Ticket status updated to '${res.data.status}' successfully.`);
        this.selectedTicket = res.data;
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to update ticket status');
      }
    });
  }

  cancelMyTicket(): void {
    if (!this.selectedTicket) return;
    if (!confirm('Are you sure you want to cancel this support request?')) return;

    this.helpdeskService.updateTicketStatus({
      ticketId: this.selectedTicket.id,
      status: 'Cancelled',
      resolutionNotes: 'Cancelled by requester'
    }).subscribe({
      next: (res: any) => {
        this.toastr.success('Ticket cancelled successfully.');
        this.selectedTicket = res.data;
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to cancel ticket');
      }
    });
  }

  confirmAndCloseTicket(): void {
    if (!this.selectedTicket) return;

    this.helpdeskService.updateTicketStatus({
      ticketId: this.selectedTicket.id,
      status: 'Closed',
      resolutionNotes: 'Resolution accepted and closed by requester.'
    }).subscribe({
      next: (res: any) => {
        this.toastr.success('Ticket closed successfully. Thank you!');
        this.selectedTicket = res.data;
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to close ticket');
      }
    });
  }

  reopenTicket(): void {
    if (!this.selectedTicket) return;
    const reason = prompt('Please explain why this issue is unresolved or requires reopening:');
    if (!reason || !reason.trim()) {
      this.toastr.warning('A reason is required to reopen the ticket.');
      return;
    }

    this.helpdeskService.updateTicketStatus({
      ticketId: this.selectedTicket.id,
      status: 'In Progress',
      resolutionNotes: `Ticket reopened by requester: ${reason.trim()}`
    }).subscribe({
      next: (res: any) => {
        this.toastr.success('Ticket reopened and returned to assigned agent.');
        this.selectedTicket = res.data;
        this.loadTickets();
        this.loadMetrics();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to reopen ticket');
      }
    });
  }

  postComment(): void {
    if (!this.selectedTicket || !this.newCommentText.trim()) return;

    this.isPostingComment = true;
    this.helpdeskService.addComment(this.selectedTicket.id, this.newCommentText.trim()).subscribe({
      next: (res: any) => {
        this.toastr.success('Comment posted');
        this.newCommentText = '';
        this.isPostingComment = false;
        if (!this.selectedTicket!.activities) {
          this.selectedTicket!.activities = [];
        }
        this.selectedTicket!.activities.push(res.data);
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to post comment');
        this.isPostingComment = false;
      }
    });
  }

  getActivityBadgeClass(type: string): string {
    switch (type) {
      case 'Created': return 'badge-created';
      case 'Assigned': return 'badge-assigned';
      case 'StatusChange': return 'badge-status';
      case 'Resolution': return 'badge-resolution';
      default: return 'badge-comment';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'Created': return 'add_circle';
      case 'Assigned': return 'person';
      case 'StatusChange': return 'sync_alt';
      case 'Resolution': return 'task_alt';
      default: return 'chat_bubble';
    }
  }
}
