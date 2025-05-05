import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from '../header/header.component';
import { SidbarComponent } from '../sidbar/sidbar.component';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
@Component({
  selector: 'app-index',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatSidenavModule, HeaderComponent, SidbarComponent, RouterOutlet],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent {
  sidebaropen = true;
  drawerMode: 'side' | 'over' = 'side';

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        if (result.matches) {
          this.drawerMode = 'side';
          this.sidebaropen = true; // close on mobile by default
        } else {
          this.drawerMode = 'side';
          this.sidebaropen = true; // open on desktop
        }
      });
  }
  sidebarToggler(){
    this.sidebaropen = !this.sidebaropen;
  }
}
