import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidbar',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, MatIconModule, RouterLink, MatMenuModule, CommonModule],
  templateUrl: './sidbar.component.html',
  styleUrl: './sidbar.component.scss'
})
export class SidbarComponent {
  constructor() { }
  menuItems = [
    { label: 'Employee', icon: 'people', route: '/index/home' },
    // { label: 'SERVICES', icon: 'build', route: '/index/services' },
    { label: 'Skill', icon: 'psychology', route: '/index/skill' },
    { label: 'Candidate', icon: 'person_search', route: '/index/candidate' },
    { label: 'Design ation', icon: 'badge', route: '/index/designation' },
    { label: 'Holiday', icon: 'beach_access', route: '/index/holiday' },
    { label: 'Leave', icon: 'event_busy', route: '/index/leavetype' },
    { label: 'Assets', icon: 'inventory', route: '/index/assets' },
    { label: 'Project', icon: 'storage', route: '/index/project' },
    { label: 'Role', icon: 'person', route: '/index/rolemaster' },
    { label: 'Time Attend', icon: 'event_available', route: '/index/attendance' },
    { label: 'Shift', icon: 'schedule', route: '/index/shift' },
    { label: 'Payroll', icon: 'account_balance_wallet', route: '/index/paymentinfo' },
    { label: 'Docs', icon: 'description', route: '/index/document' },
    { label: 'leave Request', icon: 'description', route: '/index/leaveRequest' },
  ];
}
