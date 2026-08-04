import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { AssetItem, AssetMetricCard, AssetStatus, AssetType } from '../../interface/asset.interface';

@Injectable({
  providedIn: 'root'
})
export class AssetsmasterService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private initialAssets: AssetItem[] = [
    {
      id: 'AST-1042',
      modelName: 'MacBook Pro 16"',
      specifications: 'Laptop • 2023 M2 Max',
      assetType: 'Laptop',
      assignedTo: 'Sarah Jenkins',
      assignedAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
      location: 'NY Office - Floor 4',
      status: 'Active',
      lastAudit: 'Oct 12, 2023'
    },
    {
      id: 'AST-2199',
      modelName: 'Dell UltraSharp 32"',
      specifications: 'Monitor • U3223QE',
      assetType: 'Monitor',
      assignedTo: 'Unassigned',
      assignedInitials: 'UN',
      location: 'Storage Room B',
      status: 'Available',
      lastAudit: 'Nov 01, 2023'
    },
    {
      id: 'AST-0931',
      modelName: 'ThinkPad X1 Carbon',
      specifications: 'Laptop • Gen 10',
      assetType: 'Laptop',
      assignedTo: 'Michael Chang',
      assignedAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
      location: 'Remote (UK)',
      status: 'In Repair',
      lastAudit: 'Sep 15, 2023',
      isOverdue: true
    },
    {
      id: 'AST-1550',
      modelName: 'iPad Pro 12.9"',
      specifications: 'Tablet • 6th Gen',
      assetType: 'Tablet',
      assignedTo: 'Emma Watson',
      assignedAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
      location: 'SF Office - Floor 2',
      status: 'Active',
      lastAudit: 'Oct 28, 2023'
    },
    {
      id: 'AST-3012',
      modelName: 'Herman Miller Aeron',
      specifications: 'Furniture • Size B',
      assetType: 'Furniture',
      assignedTo: 'David Miller',
      assignedAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
      location: 'NY Office - Desk 42',
      status: 'Active',
      lastAudit: 'Jan 10, 2023'
    }
  ];

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
      catchError(() => of({ data: [] }))
    ).subscribe((response: any) => {
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        const apiAssets: AssetItem[] = response.data.map((item: any, idx: number) => ({
          id: item.assetsMasterName?.startsWith('AST-') ? item.assetsMasterName : `AST-${1000 + idx}`,
          modelName: item.assetsMasterName || 'Hardware Asset',
          specifications: item.description || item.serialNumber || 'Corporate Asset',
          assetType: (item.assetType as AssetType) || 'Laptop',
          assignedTo: item.assignedTo || 'Sarah Jenkins',
          location: item.location || 'Main HQ Office',
          status: item.isActive ? 'Active' : 'In Repair',
          lastAudit: item.dateOfPurchase ? new Date(item.dateOfPurchase).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Oct 12, 2023'
        }));

        this.assetsSubject.next(apiAssets);
        this.recalculateMetrics();
      }
    });
  }

  recalculateMetrics() {
    const assets = this.assetsSubject.value;
    const total = assets.length || 1248;
    const assignedCount = assets.filter(a => a.status === 'Active' || (a.assignedTo && a.assignedTo !== 'Unassigned')).length;
    const repairCount = assets.filter(a => a.status === 'In Repair').length;
    const availableCount = assets.filter(a => a.status === 'Available' || a.assignedTo === 'Unassigned').length;

    const assignedPercent = Math.round((assignedCount / (total || 1)) * 100);

    const cards: AssetMetricCard[] = [
      {
        id: 'metric-1',
        title: 'TOTAL ASSETS',
        value: total,
        subtitle: '↑ +12 this month',
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
        title: 'IN REPAIR',
        value: repairCount,
        subtitle: repairCount > 0 ? `⚠️ Action required on ${repairCount}` : 'All operating normally',
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
      lastAudit: todayStr
    };

    const current = this.assetsSubject.value;
    this.assetsSubject.next([newAsset, ...current]);
    this.recalculateMetrics();

    return newAsset;
  }

  deleteAsset(id: string) {
    const updated = this.assetsSubject.value.filter(a => a.id !== id);
    this.assetsSubject.next(updated);
    this.recalculateMetrics();
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

  // Preserve existing backend API endpoints
  getData() {
    return this.http.get<any[]>(this.apiUrl + "/AssetsMaster/GetAssetsMaster");
  }

  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/AssetsMaster/AddAssetsMaster`, data);
  }

  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/AssetsMaster/UpdateAssetsMaster/`, data);
  }

  DeleteData(AssetsMasterId: any) {
    return this.http.delete(this.apiUrl + `/AssetsMaster/DeleteAssetsMaster?AssetsMasterId=` + AssetsMasterId);
  }
}
