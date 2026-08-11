import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
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
  sections: MenuSection[] = [
    {
      items: [
        { label: 'Home', icon: 'grid_view', route: '/index/home' },
        { label: 'Candidate', icon: 'person_search', route: '/index/candidate' },
        { label: 'Skill', icon: 'psychology', route: '/index/skill' },
        { label: 'Role', icon: 'account_tree', route: '/index/rolemaster' },
        { label: 'Designation', icon: 'badge', route: '/index/designation' }
      ]
    },
    {
      title: 'WORKFORCE',
      items: [
        { label: 'Time Attendance', icon: 'schedule', route: '/index/attendance' },
        { label: 'Shift', icon: 'calendar_month', route: '/index/shift' },
        { label: 'Holiday', icon: 'event', route: '/index/holiday' },
        { label: 'Leave', icon: 'event_busy', route: '/index/leavetype' },
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
        { label: 'Payroll', icon: 'payments', route: '/index/paymentinfo' }
      ]
    }
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem("RoleType")?.split(',').some((x): any => x === 'Manager')) {
      const workforce = this.sections.find(s => s.title === 'WORKFORCE');
      if (workforce && !workforce.items.some(i => i.route === '/index/request')) {
        workforce.items.push({ label: 'Request Approvals', icon: 'fact_check', route: '/index/request' });
      }
    }
  }

  onQuickAction() {
    console.log('Quick Action clicked');
  }
}
