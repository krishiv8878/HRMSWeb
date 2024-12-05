import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from '../header/header.component';
import { SidbarComponent } from '../sidbar/sidbar.component';
import { RouterOutlet } from '@angular/router';
import { HomeComponent } from "../home/home.component";


@Component({
  selector: 'app-index',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatSidenavModule, HeaderComponent, SidbarComponent, RouterOutlet, HomeComponent],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent {
  sidebaropen = true;
  sidebarToggler(){
    this.sidebaropen = !this.sidebaropen;
  }
}
