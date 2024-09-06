import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {MatDividerModule} from '@angular/material/divider';
import {MatSidenavModule} from '@angular/material/sidenav';
import { HeaderComponent } from './component/header/header.component';
import { SidbarComponent } from './component/sidbar/sidbar.component';
import { LoginComponent } from "./auth/login/login.component";
import { HomeComponent } from "./component/home/home.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatDividerModule, MatSidenavModule, CommonModule, HeaderComponent, SidbarComponent, LoginComponent, HomeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'hrms-web-app';
  sidebaropen = true;
  sidebarToggler(){
    this.sidebaropen = !this.sidebaropen;
  }
}
