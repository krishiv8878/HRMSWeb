import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCard, MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardModule],
  templateUrl: './userprofile.component.html',
  styleUrl: './userprofile.component.scss'
})
export class UserprofileComponent {
  constructor() { }
}
