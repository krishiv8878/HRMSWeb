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
    { label: 'HOME', icon: 'home', route: '/index/home' },
    // { label: 'SERVICES', icon: 'build', route: '/index/services' },
    { label: 'SKILL', icon: 'psychology', route: '/index/skill' },
    { label: 'CANDIDATE', icon: 'person_search', route: '/index/candidate' },
    { label: 'DESIGN', icon: 'badge', route: '/index/designation' },
    { label: 'HOLIDAY', icon: 'beach_access', route: '/index/holiday' },
    { label: 'LEAVE', icon: 'event_busy', route: '/index/leavetype' },
    { label: 'ASSETS', icon: 'inventory', route: '/index/assets' },
    { label: 'PROJECT', icon: 'assignment', route: '/index/project' },
    { label: 'ROLE', icon: 'supervisor_account', route: '/index/rolemaster' },
    { label: 'TIME TRKD', icon: 'event_available', route: '/index/attendance' },
    // { label: 'SHIFT', icon: 'schedule', route: '/index/shift' },
    // { label: 'PAYROLL', icon: 'account_balance_wallet', route: '/index/paymentinfo' },
    // { label: 'DOCS', icon: 'description', route: '/index/document' },
    // { label: 'APPS', icon: 'description', route: '/index/leaveRequest' },
  ];
}
