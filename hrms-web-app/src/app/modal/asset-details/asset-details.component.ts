import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AssetItem } from '../../interface/asset.interface';

@Component({
  selector: 'app-asset-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './asset-details.component.html',
  styleUrl: './asset-details.component.scss'
})
export class AssetDetailsComponent {
  constructor(
    public dialogRef: MatDialogRef<AssetDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public asset: AssetItem
  ) {}

  closeModal() {
    this.dialogRef.close();
  }

  sendForDeployment() {
    this.dialogRef.close({ action: 'deploy', id: this.asset.id });
  }

  getStatusPillClass(status: string): string {
    switch (status) {
      case 'Active': return 'pill-active';
      case 'Available': return 'pill-available';
      case 'In Repair': return 'pill-repair';
      default: return 'pill-available';
    }
  }
}
