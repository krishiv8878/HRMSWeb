import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RbacService } from '../../core/rbac.service';
import { SidebarService } from '../../services/sidebar/sidebar.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidbar.component.html',
  styleUrl: './sidbar.component.scss'
})
export class SidbarComponent implements OnInit {
  public rbacService = inject(RbacService);
  public sidebarService = inject(SidebarService);

  get isCollapsed(): boolean {
    return this.sidebarService.isCollapsed;
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  onLogoClick(): void {
    if (this.isCollapsed) {
      this.sidebarService.setCollapsed(false);
    }
  }
  private rawSections: MenuSection[] = [
    {
      items: [
        { label: 'Home', icon: 'grid_view', route: '/index/home', roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management'] },
        { label: 'Candidate', icon: 'person_search', route: '/index/candidate', roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management', 'Employee'] },
        { label: 'Skill', icon: 'psychology', route: '/index/skill', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] },
        { label: 'Role', icon: 'account_tree', route: '/index/rolemaster', roles: ['Admin', 'System Admin'] },
        { label: 'Designation', icon: 'badge', route: '/index/designation', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
      ]
    },
    {
      title: 'WORKFORCE',
      items: [
        { label: 'Time Attendance', icon: 'schedule', route: '/index/attendance' },
        { label: 'Timesheet', icon: 'more_time', route: '/index/timesheet' },
        { label: 'Shift', icon: 'calendar_month', route: '/index/shift', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] },
        { label: 'Holiday', icon: 'event', route: '/index/holiday' },
        { label: 'Leave', icon: 'event_busy', route: '/index/leavetype', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] },
        { label: 'Leave Requests', icon: 'pending_actions', route: '/index/leaveRequest' },
        { label: 'Request Approvals', icon: 'fact_check', route: '/index/request' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Project', icon: 'account_tree', route: '/index/project' },
        { label: 'Assets', icon: 'inventory_2', route: '/index/assets' },
        { label: 'Docs', icon: 'description', route: '/index/document' },
        { label: 'Payroll & Payslips', icon: 'payments', route: '/index/paymentinfo' },
        { label: 'Email Templates', icon: 'mail', route: '/index/email-templates', roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management', 'Employee'] }
      ]
    }
  ];

  sections: MenuSection[] = [];

  ngOnInit(): void {
    this.filterMenu();
  }

  filterMenu(): void {
    const isApprover = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management']);
    this.sections = this.rawSections
      .map(section => ({
        ...section,
        items: section.items
          .filter(item => {
            if (!item.roles || item.roles.length === 0) {
              return true;
            }
            return this.rbacService.hasAnyRole(item.roles);
          })
          .map(item => {
            if (item.route === '/index/request') {
              return {
                ...item,
                label: isApprover ? 'Request Approvals' : 'My Requests'
              };
            }
            return item;
          })
      }))
      .filter(section => section.items.length > 0);
  }

  onQuickAction() {
    console.log('Quick Action clicked');
  }
}
