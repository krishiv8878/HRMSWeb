import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
// import { SidbarComponent } from "../sidbar/sidbar.component";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
// import { RouterLink } from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {Router, RouterLink} from '@angular/router'
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule,MatIconModule,MatSlideToggleModule,MatMenuModule,RouterLink,CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() toggleSidebarForMe: EventEmitter<any> = new EventEmitter();
  constructor() { }
  router =inject(Router)
  toggleSidebar() {
    this.toggleSidebarForMe.emit();
  }
  logout(){
    localStorage.removeItem("LoginTokan");
    this.router.navigate(['login'])
  }
}
