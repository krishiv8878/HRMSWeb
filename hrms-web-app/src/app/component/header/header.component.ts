import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResignationComponent } from '../../modal/resignation/resignation.component';
import { DocumentService } from '../../services/documnets/document.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatDividerModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() toggleSidebarForMe: EventEmitter<any> = new EventEmitter();
  router = inject(Router);
  dialog = inject(MatDialog);
  documentService = inject(DocumentService);

  headerSearchQuery: string = '';

  navTabs = [
    { label: 'Dashboard', active: false },
    { label: 'Workforce', active: false },
    { label: 'Projects', active: true }
  ];

  onSearchChange(query: string) {
    this.documentService.setSearchQuery(query);
  }

  selectTab(tabName: string) {
    this.navTabs.forEach(t => t.active = t.label === tabName);
  }

  getUserName() {
    return this.documentService.getLoggedInUser().name;
  }

  getUserInitials() {
    return this.documentService.getLoggedInUser().initials;
  }

  getUserAvatar(): string | undefined {
    return this.documentService.getLoggedInUser().avatar;
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
    this.dialog.open(ResignationComponent);
  }
}
