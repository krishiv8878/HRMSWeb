import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AssetMetricCard } from '../../../interface/asset.interface';

@Component({
  selector: 'app-asset-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  @Input({ required: true }) card!: AssetMetricCard;

  getCardThemeClass(): string {
    switch (this.card.theme) {
      case 'blue': return 'theme-blue';
      case 'indigo': return 'theme-indigo';
      case 'rose': return 'theme-rose';
      case 'emerald': return 'theme-emerald';
      default: return 'theme-blue';
    }
  }
}
