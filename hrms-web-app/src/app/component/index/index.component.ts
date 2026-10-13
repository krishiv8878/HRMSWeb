import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidbarComponent } from '../sidbar/sidbar.component';
import { ChatWidgetComponent } from '../chat-widget/chat-widget.component';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidbarComponent, ChatWidgetComponent],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent {}
