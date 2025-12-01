import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
// import { SidbarComponent } from "../sidbar/sidbar.component";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
// import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ResignationComponent } from '../../modal/resignation/resignation.component';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatSlideToggleModule, MatMenuModule, RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() toggleSidebarForMe: EventEmitter<any> = new EventEmitter();
  constructor() { }
  router = inject(Router)
  dialog = inject(MatDialog)
getUserName(){
  return `${localStorage.getItem('UserName')}`
}
getUserRole(){
  return `${localStorage.getItem('RoleType')}`
}
  toggleSidebar() {
    this.toggleSidebarForMe.emit();
  }
  logout() {
    localStorage.clear();
    this.router.navigate(['login'])
  }
  resignation() {
    const dialogRef = this.dialog.open(ResignationComponent)
  }
}
