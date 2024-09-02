import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {MatDividerModule} from '@angular/material/divider';
import {MatSidenavModule} from '@angular/material/sidenav';
// import { HomeComponent } from "./components/home/home.component";
import { HeaderComponent } from './component/header/header.component';
import { SidbarComponent } from './component/sidbar/sidbar.component';
import { LoginComponent } from "./auth/login/login.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatDividerModule, MatSidenavModule, CommonModule, HeaderComponent, SidbarComponent, LoginComponent],
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
