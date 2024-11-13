import { Component, EventEmitter, Output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
// import { SidbarComponent } from "../sidbar/sidbar.component";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
// import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule,MatIconModule,MatSlideToggleModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() toggleSidebarForMe: EventEmitter<any> = new EventEmitter();
  constructor() { }
  toggleSidebar() {
    this.toggleSidebarForMe.emit();
  }
}
