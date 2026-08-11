import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DocumentCategory } from '../../../interface/document.interface';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './category-card.component.html',
  styleUrl: './category-card.component.scss'
})
export class CategoryCardComponent {
  @Input({ required: true }) category!: DocumentCategory;

  get formattedCount(): string {
    return this.category.fileCount.toLocaleString() + ' Files';
  }
}
