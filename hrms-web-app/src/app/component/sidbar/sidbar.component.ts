import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RbacService } from '../../core/rbac.service';

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
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidbar.component.html',
  styleUrl: './sidbar.component.scss'
})
export class SidbarComponent implements OnInit {
  private rawSections: MenuSection[] = [
    {
      items: [
        { label: 'Home', icon: 'grid_view', route: '/index/home', roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management'] },
        { label: 'Candidate', icon: 'person_search', route: '/index/candidate', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] },
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
        { label: 'Request Approvals', icon: 'fact_check', route: '/index/request', roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management'] }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Project', icon: 'account_tree', route: '/index/project' },
        { label: 'Assets', icon: 'inventory_2', route: '/index/assets' },
        { label: 'Docs', icon: 'description', route: '/index/document' },
        { label: 'Payroll', icon: 'payments', route: '/index/paymentinfo', roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
      ]
    }
  ];

  sections: MenuSection[] = [];

  constructor(public rbacService: RbacService) {}

  ngOnInit(): void {
    this.filterMenu();
  }

  filterMenu(): void {
    this.sections = this.rawSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!item.roles || item.roles.length === 0) {
            return true;
          }
          return this.rbacService.hasAnyRole(item.roles);
        })
      }))
      .filter(section => section.items.length > 0);
  }

  onQuickAction() {
    console.log('Quick Action clicked');
  }
}
