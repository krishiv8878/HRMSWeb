import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
import { AssetItem, AssetMetricCard, AssetStatus, AssetType } from '../../interface/asset.interface';

@Injectable({
  providedIn: 'root'
})
export class AssetsmasterService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private initialAssets: AssetItem[] = [];

  private assetsSubject = new BehaviorSubject<AssetItem[]>(this.initialAssets);
  assets$: Observable<AssetItem[]> = this.assetsSubject.asObservable();

  private metricsSubject = new BehaviorSubject<AssetMetricCard[]>([]);
  metrics$: Observable<AssetMetricCard[]> = this.metricsSubject.asObservable();

  constructor() {
    this.recalculateMetrics();
    this.fetchAssetsFromApi();
  }

  fetchAssetsFromApi() {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) return;

    this.http.get<any>(this.apiUrl + `/AssetsMaster/GetAssetsMaster`).pipe(
      catchError(() => this.http.get<any>(this.apiUrl + `/AssetsMaster/GetAllAssetsMaster`)),
      catchError((err) => {
        console.error('Error fetching assets from API:', err);
        return of({ data: [] });
      })
    ).subscribe((response: any) => {
      const rawList = Array.isArray(response) ? response : (response?.data || response?.result || []);
      if (Array.isArray(rawList) && rawList.length > 0) {
        const apiAssets: AssetItem[] = rawList.map((item: any, idx: number) => {
          const activeState = item.isActive !== false && item.isActive !== 0 && item.isActive !== 'false' && item.isActive !== '0';
          const assetStatus: AssetStatus = activeState ? (item.status || 'Active') : 'In Repair';

          return {
            id: item.assetsMasterId ? String(item.assetsMasterId) : (item.id ? String(item.id) : `AST-${1000 + idx}`),
            modelName: item.assetsMasterName || item.modelName || 'Hardware Asset',
            specifications: item.description || item.specifications || item.serialNumber || 'Corporate Asset',
            assetType: (item.assetType as AssetType) || 'Laptop',
            assignedTo: item.assignedTo || 'Unassigned',
            location: item.location || 'Main HQ Office',
            status: assetStatus,
            isActive: activeState,
            lastAudit: item.dateOfPurchase ? new Date(item.dateOfPurchase).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'
          };
        });

        this.assetsSubject.next(apiAssets);
      } else {
        this.assetsSubject.next([]);
      }
      this.recalculateMetrics();
    });
  }

  recalculateMetrics() {
    const assets = this.assetsSubject.value;
    const total = assets.length;
    const assignedCount = assets.filter(a => a.status === 'Active' || (a.assignedTo && a.assignedTo !== 'Unassigned')).length;
    const repairCount = assets.filter(a => a.status === 'In Repair' || a.isActive === false).length;
    const availableCount = assets.filter(a => a.status === 'Available' || a.assignedTo === 'Unassigned').length;

    const assignedPercent = total > 0 ? Math.round((assignedCount / total) * 100) : 0;

    const cards: AssetMetricCard[] = [
      {
        id: 'metric-1',
        title: 'TOTAL ASSETS',
        value: total,
        subtitle: 'Live database count',
        iconName: 'inventory_2',
        theme: 'blue',
        isPositive: true
      },
      {
        id: 'metric-2',
        title: 'ASSIGNED',
        value: assignedCount,
        subtitle: `${assignedPercent}% of total inventory`,
        iconName: 'person_outline',
        theme: 'indigo'
      },
      {
        id: 'metric-3',
        title: 'IN REPAIR (INACTIVE)',
        value: repairCount,
        subtitle: repairCount > 0 ? `⚠️ ${repairCount} asset(s) currently inactive` : 'All operating normally',
        iconName: 'build',
        theme: 'rose',
        isWarning: repairCount > 0
      },
      {
        id: 'metric-4',
        title: 'AVAILABLE',
        value: availableCount,
        subtitle: 'Ready for deployment',
        iconName: 'check_circle_outline',
        theme: 'emerald'
      }
    ];

    this.metricsSubject.next(cards);
  }

  addAsset(assetData: Partial<AssetItem>): AssetItem {
    const nextId = `AST-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const isUnassigned = !assetData.assignedTo || assetData.assignedTo === 'Unassigned';

    const newAsset: AssetItem = {
      id: assetData.id || nextId,
      modelName: assetData.modelName || 'New Hardware Asset',
      specifications: assetData.specifications || `${assetData.assetType || 'Laptop'} • Corporate Unit`,
      assetType: assetData.assetType || 'Laptop',
      assignedTo: isUnassigned ? 'Unassigned' : assetData.assignedTo,
      assignedInitials: isUnassigned ? 'UN' : undefined,
      assignedAvatar: !isUnassigned ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' : undefined,
      location: assetData.location || 'NY Office - Floor 4',
      status: assetData.status || (isUnassigned ? 'Available' : 'Active'),
      lastAudit: todayStr,
      isActive: true
    };

    const current = this.assetsSubject.value;
    this.assetsSubject.next([newAsset, ...current]);
    this.recalculateMetrics();

    return newAsset;
  }

  updateAsset(updatedAsset: AssetItem) {
    const current = this.assetsSubject.value;
    const index = current.findIndex(a => String(a.id) === String(updatedAsset.id));
    if (index !== -1) {
      current[index] = { ...current[index], ...updatedAsset };
      this.assetsSubject.next([...current]);
    } else {
      this.assetsSubject.next([updatedAsset, ...current]);
    }
    this.recalculateMetrics();
  }

  sendForDeployment(id: string) {
    const updated = this.assetsSubject.value.map(a => {
      if (String(a.id) === String(id)) {
        return {
          ...a,
          status: 'Available' as AssetStatus,
          assignedTo: 'Unassigned',
          assignedInitials: 'UN',
          assignedAvatar: undefined,
          isActive: true
        };
      }
      return a;
    });

    this.assetsSubject.next(updated);
    this.recalculateMetrics();

    const target = updated.find(a => String(a.id) === String(id));
    if (target) {
      const numericId = parseInt(String(id).replace(/\D/g, ''), 10) || 1;
      this.updateData({
        assetsMasterId: numericId,
        id: numericId,
        assetsMasterName: target.modelName,
        status: 'Available',
        assignedTo: 'Unassigned',
        isActive: true
      }).subscribe({
        next: () => console.log('Asset status changed to Available via API'),
        error: (err) => console.log('API update call finished:', err)
      });
    }
  }

  sendToRepair(id: string) {
    const current = this.assetsSubject.value;
    const target = current.find(a => String(a.id) === String(id));
    const numericId = parseInt(String(id).replace(/\D/g, ''), 10) || Number(id) || 1;
    const existingAssignedTo = target?.assignedTo || 'Unassigned';

    const payload = {
      id: numericId,
      assetsMasterId: numericId,
      assetsMasterName: target?.modelName || 'Asset',
      description: target?.specifications || '',
      status: 'In Repair',
      assignedTo: existingAssignedTo,
      location: target?.location || 'Main HQ Office',
      isActive: true,
      isDeleted: false
    };

    this.updateData(payload).subscribe({
      next: () => {
        const updated = this.assetsSubject.value.map(a => {
          if (String(a.id) === String(id)) {
            return {
              ...a,
              status: 'In Repair' as AssetStatus,
              assignedTo: existingAssignedTo,
              isActive: true
            };
          }
          return a;
        });
        this.assetsSubject.next(updated);
        this.recalculateMetrics();
      },
      error: () => {
        const updated = this.assetsSubject.value.map(a => {
          if (String(a.id) === String(id)) {
            return {
              ...a,
              status: 'In Repair' as AssetStatus,
              assignedTo: existingAssignedTo,
              isActive: true
            };
          }
          return a;
        });
        this.assetsSubject.next(updated);
        this.recalculateMetrics();
      }
    });
  }

  deleteAsset(id: string) {
    const numericId = parseInt(String(id).replace(/\D/g, ''), 10) || Number(id) || 1;
    this.DeleteData(numericId).subscribe({
      next: () => {
        const updated = this.assetsSubject.value.filter(a => String(a.id) !== String(id));
        this.assetsSubject.next(updated);
        this.recalculateMetrics();
      },
      error: () => {
        const updated = this.assetsSubject.value.filter(a => String(a.id) !== String(id));
        this.assetsSubject.next(updated);
        this.recalculateMetrics();
      }
    });
  }

  exportToCsv() {
    if (typeof window === 'undefined') return;

    const assets = this.assetsSubject.value;
    const headers = ['Asset ID', 'Model Name', 'Type & Specs', 'Assigned To', 'Location', 'Status', 'Last Audit'];
    const rows = assets.map(a => [
      `"${a.id}"`,
      `"${a.modelName}"`,
      `"${a.specifications}"`,
      `"${a.assignedTo || 'Unassigned'}"`,
      `"${a.location}"`,
      `"${a.status}"`,
      `"${a.lastAudit}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Asset_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Backend API Endpoints
  getData() {
    return this.http.get<any>(this.apiUrl + "/AssetsMaster/GetAssetsMaster");
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/AssetsMaster/AddAssetsMaster`, data).pipe(
      tap(() => this.fetchAssetsFromApi()),
      catchError((err) => {
        console.error('Error calling AddAssetsMaster API:', err);
        return of(null);
      })
    );
  }

  updateData(data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + `/AssetsMaster/UpdateAssetsMaster`, data).pipe(
      tap(() => this.fetchAssetsFromApi()),
      catchError((err) => {
        console.error('Error calling UpdateAssetsMaster API:', err);
        return of(null);
      })
    );
  }

  DeleteData(AssetsMasterId: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + `/AssetsMaster/DeleteAssetsMaster?AssetsMasterId=` + AssetsMasterId).pipe(
      tap(() => this.fetchAssetsFromApi()),
      catchError((err) => {
        console.error('Error calling DeleteAssetsMaster API:', err);
        return of(null);
      })
    );
  }
}
