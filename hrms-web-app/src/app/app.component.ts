import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'hrms-web-app';
  // @HostListener('window:beforeunload', ['$event'])
  handleTabClose(event: Event) {
    // Optional: remove auth token or update last activity
    localStorage.removeItem('LoginTokan');
  }
}
