import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { AssetItem, AssetMetricCard } from '../../interface/asset.interface';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { AssetCardComponent } from './asset-card/asset-card.component';
import { AssetTableComponent } from './asset-table/asset-table.component';
import { AssetsmastersComponent } from '../../modal/assetsmasters/assetsmasters.component';

@Component({
  selector: 'app-assetsmaster',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    AssetCardComponent,
    AssetTableComponent
  ],
  templateUrl: './assetsmaster.component.html',
  styleUrl: './assetsmaster.component.scss'
})
export class AssetsmasterComponent implements OnInit {
  private assetService = inject(AssetsmasterService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  metrics$: Observable<AssetMetricCard[]> = this.assetService.metrics$;
  assets$: Observable<AssetItem[]> = this.assetService.assets$;

  ngOnInit() {
    this.assetService.recalculateMetrics();
  }

  onExport() {
    this.assetService.exportToCsv();
    this.toastr.success('Asset Inventory exported successfully!');
  }

  openAddAssetModal() {
    const dialogRef = this.dialog.open(AssetsmastersComponent, {
      width: '560px'
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.assetService.recalculateMetrics();
      }
    });
  }
}
