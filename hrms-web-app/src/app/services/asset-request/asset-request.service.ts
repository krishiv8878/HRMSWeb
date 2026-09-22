import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssetRequestItem,
  CreateAssetRequest,
  UpdateAssetRequestStatus
} from '../../interface/asset-request.interface';

@Injectable({
  providedIn: 'root'
})
export class AssetRequestService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  private requestsSubject = new BehaviorSubject<AssetRequestItem[]>([]);
  requests$ = this.requestsSubject.asObservable();

  /**
   * Fetch asset requests from API (optionally filtered by employeeId)
   */
  fetchRequests(employeeId?: number): Observable<any> {
    const url = employeeId
      ? `${this.apiUrl}/AssetRequest/GetRequests?employeeId=${employeeId}`
      : `${this.apiUrl}/AssetRequest/GetRequests`;

    return this.http.get<any>(url).pipe(
      tap((res: any) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          const sorted = [...list].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
          this.requestsSubject.next(sorted);
        }
      }),
      catchError(err => {
        console.error('Error loading asset requests:', err);
        return of({ data: [] });
      })
    );
  }

  /**
   * Submit new repair, replacement, or return request
   */
  createRequest(data: CreateAssetRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/AssetRequest/CreateRequest`, data).pipe(
      tap((res: any) => {
        if (res?.data) {
          const current = this.requestsSubject.value;
          this.requestsSubject.next([res.data, ...current]);
        }
      })
    );
  }

  /**
   * Update request status (e.g. In Repair, Dispatched with Courier/AWB, Received, Completed)
   */
  updateStatus(data: UpdateAssetRequestStatus): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/AssetRequest/UpdateStatus`, data).pipe(
      tap(() => {
        // Refresh local requests cache
        const current = this.requestsSubject.value;
        const index = current.findIndex(r => r.id === data.requestId);
        if (index !== -1) {
          current[index].status = data.newStatus;
          if (data.courierPartner) current[index].courierPartner = data.courierPartner;
          if (data.trackingNumber) current[index].trackingNumber = data.trackingNumber;
          this.requestsSubject.next([...current]);
        }
      })
    );
  }

  /**
   * Fetch single request details by ID
   */
  getRequestById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/AssetRequest/GetRequestById/${id}`);
  }

  /**
   * Upload device photos / defect attachments
   */
  uploadImages(files: File[]): Observable<any> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post<any>(`${this.apiUrl}/AssetRequest/UploadImages`, formData);
  }

  /**
   * Get active request for a specific asset (if any)
   */
  getActiveRequestForAsset(assetId: number | string, employeeId?: number): AssetRequestItem | undefined {
    const numericId = typeof assetId === 'string' ? parseInt(assetId.replace(/\D/g, ''), 10) : Number(assetId);
    return this.requestsSubject.value.find(r => {
      if (Number(r.assetId) !== numericId) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      const s = (r.status || '').toLowerCase().trim();
      const isFinished = s.includes('completed') || s.includes('closed') || s.includes('rejected') || s.includes('received');
      return !isFinished;
    });
  }

  /**
   * Get latest request for a specific asset (regardless of status, e.g. to inspect rejection)
   */
  getLatestRequestForAsset(assetId: number | string, employeeId?: number): AssetRequestItem | undefined {
    const numericId = typeof assetId === 'string' ? parseInt(assetId.replace(/\D/g, ''), 10) : Number(assetId);
    return this.requestsSubject.value.find(r => {
      if (Number(r.assetId) !== numericId) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      return true;
    });
  }

  /**
   * Get all requests for a specific asset
   */
  getAllRequestsForAsset(assetId: number | string): AssetRequestItem[] {
    const numericId = typeof assetId === 'string' ? parseInt(assetId.replace(/\D/g, ''), 10) : Number(assetId);
    return this.requestsSubject.value.filter(r => Number(r.assetId) === numericId);
  }

  /**
   * Get all requests recently rejected for a specific employee
   */
  getRecentlyRejectedRequests(employeeId?: number): AssetRequestItem[] {
    return this.requestsSubject.value.filter(r => {
      if (employeeId && r.employeeId !== employeeId) return false;
      const s = (r.status || '').toLowerCase().trim();
      return s.includes('rejected');
    });
  }
}
