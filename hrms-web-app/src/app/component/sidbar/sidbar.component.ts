import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidbar',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, MatIconModule],
  templateUrl: './sidbar.component.html',
  styleUrl: './sidbar.component.scss'
})
export class SidbarComponent {

}
