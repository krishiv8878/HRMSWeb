import { Component, ElementRef, EventEmitter, HostListener, inject, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResignationComponent } from '../../modal/resignation/resignation.component';
import { DocumentService } from '../../services/documnets/document.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { CandidateService } from '../../services/candidate/candidate.service';
import { RbacService } from '../../core/rbac.service';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Module' | 'Employee' | 'Document' | 'Candidate';
  icon: string;
  route?: string;
  avatarUrl?: string;
  initials?: string;
  metaBadge?: string;
  queryParams?: any;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatButtonModule,
    RouterLink
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebarForMe: EventEmitter<any> = new EventEmitter();
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainerRef!: ElementRef<HTMLDivElement>;

  router = inject(Router);
  dialog = inject(MatDialog);
  documentService = inject(DocumentService);
  employeeService = inject(EmployeeService);
  candidateService = inject(CandidateService);
  rbacService = inject(RbacService);

  headerSearchQuery: string = '';
  isSearchOpen: boolean = false;
  selectedIndex: number = -1;

  // Cached Search Pools
  private cachedEmployees: SearchResultItem[] = [];
  private cachedDocuments: SearchResultItem[] = [];
  private cachedCandidates: SearchResultItem[] = [];

  // Grouped Filtered Results
  filteredModules: SearchResultItem[] = [];
  filteredEmployees: SearchResultItem[] = [];
  filteredDocuments: SearchResultItem[] = [];
  filteredCandidates: SearchResultItem[] = [];

  // Flat array for keyboard navigation
  allFilteredResults: SearchResultItem[] = [];

  readonly systemModules: SearchResultItem[] = [
    { id: 'mod-home', title: 'Employee Directory', subtitle: 'Manage staff, employee profiles, roles & teams', category: 'Module', icon: 'badge', route: '/index/home' },
    { id: 'mod-shift', title: 'Shift Management', subtitle: 'Work schedules, shift allocations & timings', category: 'Module', icon: 'schedule', route: '/index/shift' },
    { id: 'mod-holiday', title: 'Holiday Calendar', subtitle: 'Public holidays, company offs & calendar', category: 'Module', icon: 'event_available', route: '/index/holiday' },
    { id: 'mod-leave-req', title: 'Leave Requests', subtitle: 'Employee time off requests & balance tracking', category: 'Module', icon: 'beach_access', route: '/index/leaveRequest' },
    { id: 'mod-leave-type', title: 'Leave Types & Policies', subtitle: 'Annual, Sick, Maternity & Casual leave allowances', category: 'Module', icon: 'rule', route: '/index/leavetype' },
    { id: 'mod-approvals', title: 'Requests & Approvals', subtitle: 'Manager approval workflows & attendance adjustments', category: 'Module', icon: 'assignment_turned_in', route: '/index/request' },
    { id: 'mod-doc', title: 'Document Repository', subtitle: 'Company policies, contracts & employee documents', category: 'Module', icon: 'folder_shared', route: '/index/document' },
    { id: 'mod-assets', title: 'Asset Management', subtitle: 'Laptops, hardware inventory & allocations', category: 'Module', icon: 'inventory_2', route: '/index/assets' },
    { id: 'mod-candidate', title: 'Candidate Pipeline (Talent)', subtitle: 'Talent recruitment, applicants, interviews & hiring', category: 'Module', icon: 'group_add', route: '/index/candidate' },
    { id: 'mod-designation', title: 'Designations Master', subtitle: 'Job titles, organizational levels & hierarchies', category: 'Module', icon: 'workspace_premium', route: '/index/designation' },
    { id: 'mod-rolemaster', title: 'Role Master (RBAC)', subtitle: 'System security roles, admin rights & permissions', category: 'Module', icon: 'admin_panel_settings', route: '/index/rolemaster' },
    { id: 'mod-project', title: 'Project Portfolio', subtitle: 'Active client projects, engagements & milestones', category: 'Module', icon: 'work', route: '/index/project' },
    { id: 'mod-skill', title: 'Skills Catalog', subtitle: 'Technical competencies, tools & talent catalog', category: 'Module', icon: 'psychology', route: '/index/skill' },
    { id: 'mod-payment', title: 'Payment & Banking Info', subtitle: 'Bank accounts, IFSC, and salary disbursement', category: 'Module', icon: 'account_balance_wallet', route: '/index/paymentinfo' },
    { id: 'mod-attendance', title: 'Attendance & Time Logs', subtitle: 'Clock-in / Clock-out, biometric records & logs', category: 'Module', icon: 'fingerprint', route: '/index/attendance' },
    { id: 'mod-timesheet', title: 'Timesheet Management', subtitle: 'Project task logging, attendance hours & approvals', category: 'Module', icon: 'more_time', route: '/index/timesheet' },
    { id: 'mod-profile', title: 'My User Profile', subtitle: 'Personal profile details, contact & compensation', category: 'Module', icon: 'account_circle', route: '/index/user-profile' },
    { id: 'mod-resignation', title: 'Resignation Request', subtitle: 'Submit notice period & exit separation workflow', category: 'Module', icon: 'exit_to_app', route: '/index/resignation' }
  ];

  currentUserName: string = '';
  currentUserInitials: string = '';

  ngOnInit(): void {
    this.employeeService.refreshCurrentLoggedInUserAvatar();
    this.loadSearchPools();
    this.refreshUserInfo();

    this.employeeService.userProfile$.subscribe(() => {
      this.refreshUserInfo();
    });
  }

  refreshUserInfo(): void {
    const user = this.documentService.getLoggedInUser();
    this.currentUserName = user.name;
    this.currentUserInitials = user.initials;
  }

  loadSearchPools(): void {
    // 1. Fetch Employees (only if Admin, HR, or Manager)
    if (this.rbacService.isAdmin() || this.rbacService.isHR() || this.rbacService.isManager()) {
      this.employeeService.getData().subscribe({
        next: (res: any) => {
          let rawList: any[] = [];
          if (Array.isArray(res)) rawList = res;
          else if (res && Array.isArray(res.data)) rawList = res.data;
          else if (res && Array.isArray(res.result)) rawList = res.result;

          const globalAvatar = this.employeeService.getProfileAvatar();
          this.cachedEmployees = rawList.map((emp: any, idx: number) => {
            const fName = emp.firstName || 'Employee';
            const lName = emp.lastName || '';
            const fullName = `${fName} ${lName}`.trim();
            const initials = ((fName[0] || 'E') + (lName[0] || '')).toUpperCase();
            const role = emp.rolenames || emp.designation || 'Team Member';
            
            let avatarUrl: string | undefined = undefined;
            if (emp.profileImage) {
              avatarUrl = emp.profileImage.startsWith('http') || emp.profileImage.startsWith('data:')
                ? emp.profileImage
                : `${this.employeeService.apiUrl.replace('/api', '')}/ProfileImages/${emp.profileImage}`;
            } else if (globalAvatar && idx === 0) {
              avatarUrl = globalAvatar;
            }

            return {
              id: `emp-${emp.id || emp.employeeId || idx}`,
              title: fullName,
              subtitle: `${role} • ${emp.emailAddress || 'employee@khrms.com'}`,
              category: 'Employee',
              icon: 'person',
              avatarUrl: avatarUrl,
              initials: initials,
              route: '/index/home',
              metaBadge: emp.department || 'Workforce'
            };
          });
        },
        error: () => {
          this.cachedEmployees = [];
        }
      });
    } else {
      this.cachedEmployees = [];
    }

    // 2. Fetch Documents (accessible to all authenticated users)
    this.documentService.documents$.subscribe((docs) => {
      if (docs && docs.length > 0) {
        this.cachedDocuments = docs.map(doc => ({
          id: `doc-${doc.id}`,
          title: doc.name,
          subtitle: `${doc.category} • ${doc.fileSize} • Owned by ${doc.ownerName}`,
          category: 'Document',
          icon: this.getDocumentIcon(doc.fileType),
          route: '/index/document',
          metaBadge: doc.accessLevel
        }));
      }
    });

    // 3. Fetch Candidates (only if Admin or HR)
    if (this.rbacService.isAdmin() || this.rbacService.isHR()) {
      this.candidateService.getData().subscribe({
        next: (res: any) => {
          let rawCandidates: any[] = [];
          if (Array.isArray(res)) rawCandidates = res;
          else if (res && Array.isArray(res.data)) rawCandidates = res.data;
          else if (res && Array.isArray(res.result)) rawCandidates = res.result;

          this.cachedCandidates = rawCandidates.map((cand: any, idx: number) => {
            const name = cand.fullName || `${cand.firstName || ''} ${cand.lastName || ''}`.trim() || 'Candidate';
            const role = cand.appliedRole || 'Software Engineer';
            const stage = cand.stage || 'Screening';
            return {
              id: `cand-${cand.id || cand.candidateId || idx}`,
              title: name,
              subtitle: `${role} • Applied for ${stage}`,
              category: 'Candidate',
              icon: 'how_to_reg',
              route: '/index/candidate',
              metaBadge: stage
            };
          });
        },
        error: () => {
          this.cachedCandidates = [];
        }
      });
    } else {
      this.cachedCandidates = [];
    }
  }

  getDocumentIcon(fileType?: string): string {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return 'picture_as_pdf';
      case 'docx':
      case 'doc': return 'description';
      case 'xlsx':
      case 'xls': return 'table_view';
      case 'zip': return 'folder_zip';
      default: return 'insert_drive_file';
    }
  }

  onSearchFocus(): void {
    if (this.headerSearchQuery.trim().length > 0) {
      this.isSearchOpen = true;
    }
  }

  onSearchChange(query: string): void {
    this.headerSearchQuery = query;
    this.documentService.setSearchQuery(query);

    const q = (query || '').trim().toLowerCase();
    if (!q) {
      this.isSearchOpen = false;
      this.filteredModules = [];
      this.filteredEmployees = [];
      this.filteredDocuments = [];
      this.filteredCandidates = [];
      this.allFilteredResults = [];
      this.selectedIndex = -1;
      return;
    }

    this.isSearchOpen = true;
    this.selectedIndex = 0;

    // Filter Modules
    this.filteredModules = this.systemModules.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.subtitle.toLowerCase().includes(q)
    );

    // Filter Employees
    this.filteredEmployees = this.cachedEmployees.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.subtitle.toLowerCase().includes(q) ||
      (e.metaBadge && e.metaBadge.toLowerCase().includes(q))
    ).slice(0, 5);

    // Filter Documents
    this.filteredDocuments = this.cachedDocuments.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.subtitle.toLowerCase().includes(q)
    ).slice(0, 5);

    // Filter Candidates
    this.filteredCandidates = this.cachedCandidates.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q)
    ).slice(0, 5);

    this.allFilteredResults = [
      ...this.filteredModules,
      ...this.filteredEmployees,
      ...this.filteredDocuments,
      ...this.filteredCandidates
    ];
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.isSearchOpen || this.allFilteredResults.length === 0) {
      if (event.key === 'Enter' && this.headerSearchQuery.trim()) {
        // Quick default jump if enter pressed without dropdown
        this.selectResult(this.systemModules[0]);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.allFilteredResults.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.allFilteredResults.length) % this.allFilteredResults.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedIndex >= 0 && this.selectedIndex < this.allFilteredResults.length) {
        this.selectResult(this.allFilteredResults[this.selectedIndex]);
      } else if (this.allFilteredResults.length > 0) {
        this.selectResult(this.allFilteredResults[0]);
      }
    } else if (event.key === 'Escape') {
      this.closeSearch();
    }
  }

  selectResult(item: SearchResultItem): void {
    if (!item) return;

    if (item.category === 'Document') {
      this.documentService.setSearchQuery(item.title);
    }

    if (item.route) {
      this.router.navigate([item.route], { queryParams: item.queryParams });
    }

    this.closeSearch();
  }

  clearSearch(): void {
    this.headerSearchQuery = '';
    this.onSearchChange('');
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  closeSearch(): void {
    this.isSearchOpen = false;
    this.selectedIndex = -1;
  }

  isItemSelected(id: string): boolean {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.allFilteredResults.length) return false;
    return this.allFilteredResults[this.selectedIndex].id === id;
  }

  get totalResultsCount(): number {
    return this.allFilteredResults.length;
  }

  // Global Keyboard Shortcut: Ctrl + K / Cmd + K to focus search
  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyboard(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.searchInputRef) {
        this.searchInputRef.nativeElement.focus();
        this.searchInputRef.nativeElement.select();
        if (this.headerSearchQuery.trim()) {
          this.isSearchOpen = true;
        }
      }
    }
  }

  // Click outside to close dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.searchContainerRef && !this.searchContainerRef.nativeElement.contains(event.target as Node)) {
      this.closeSearch();
    }
  }

  getUserName() {
    return this.currentUserName || this.documentService.getLoggedInUser().name;
  }

  getUserInitials() {
    return this.currentUserInitials || this.documentService.getLoggedInUser().initials;
  }

  getUserAvatar(): string | undefined {
    return this.employeeService.getProfileAvatar() || this.documentService.getLoggedInUser().avatar;
  }

  getUserRole() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('RoleType') || 'HR Administrator';
    }
    return 'HR Administrator';
  }

  logout() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.router.navigate(['login']);
  }

  resignation() {
    this.dialog.open(ResignationComponent, {
      width: '640px',
      maxWidth: '95vw'
    });
  }
}
