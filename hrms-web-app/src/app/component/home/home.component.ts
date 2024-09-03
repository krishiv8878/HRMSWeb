import { Component } from '@angular/core';
// import { url } from 'inspector';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  constructor() { }
  image = '/src/assets/images/download.jpg';
}
