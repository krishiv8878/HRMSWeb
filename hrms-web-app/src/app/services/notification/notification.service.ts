import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  backendId?: number;
  title: string;
  message: string;
  timestamp: string;
  category: 'Leave' | 'Attendance' | 'Document' | 'Timesheet' | 'Asset' | 'Banking' | 'Salary' | 'Interview' | 'System';
  icon: string;
  iconBg: string;
  iconColor: string;
  route: string;
  queryParams?: any;
  isRead: boolean;
  type: 'request' | 'approval' | 'info' | 'alert';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor() {
    this.refreshNotifications();
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.refreshNotifications();
      }, 20000);
    }
  }

  private getLoggedEmployeeId(): number {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return Number(localStorage.getItem('employeeId') || 0);
    }
    return 0;
  }

  refreshNotifications(): void {
    const empId = this.getLoggedEmployeeId();

    this.http.get<any>(`${this.apiUrl}/Notification/GetNotifications?employeeId=${empId}`).pipe(
      map((res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res?.data && Array.isArray(res.data)) rawList = res.data;
        else if (res?.result && Array.isArray(res.result)) rawList = res.result;

        // Ensure newest notifications always appear at the top
        rawList.sort((a: any, b: any) => {
          const idDiff = (Number(b.id) || 0) - (Number(a.id) || 0);
          if (idDiff !== 0) return idDiff;
          return new Date(b.createdDate || b.timestamp || 0).getTime() - new Date(a.createdDate || a.timestamp || 0).getTime();
        });

        return rawList.map((item: any) => {
          let parsedQuery: any = undefined;
          if (item.queryParams) {
            try {
              if (item.queryParams.startsWith('{')) {
                parsedQuery = JSON.parse(item.queryParams);
              } else if (item.queryParams.includes('=')) {
                const parts = item.queryParams.split('&');
                parsedQuery = {};
                parts.forEach((p: string) => {
                  const [k, v] = p.split('=');
                  if (k) parsedQuery[k] = v;
                });
              }
            } catch {
              parsedQuery = undefined;
            }
          }

          return {
            id: String(item.id),
            backendId: Number(item.id),
            title: item.title || 'Notification',
            message: item.message || '',
            timestamp: item.createdDate || new Date().toISOString(),
            category: item.category || 'System',
            icon: item.icon || 'notifications',
            iconBg: item.iconBg || '#eff6ff',
            iconColor: item.iconColor || '#2563eb',
            route: item.route || '/index/home',
            queryParams: parsedQuery,
            isRead: Boolean(item.isRead),
            type: item.type || 'info'
          } as AppNotification;
        });
      }),
      catchError((err) => {
        console.warn('Could not fetch notifications from backend table:', err);
        return of([] as AppNotification[]);
      })
    ).subscribe((items: AppNotification[]) => {
      this.notificationsSubject.next(items);
      this.unreadCountSubject.next(items.filter(n => !n.isRead).length);
    });
  }

  markAsRead(notificationId: string): void {
    const current = this.notificationsSubject.getValue();
    const target = current.find(n => n.id === notificationId);
    const numericId = target?.backendId || Number(notificationId);
    const empId = this.getLoggedEmployeeId();

    // Optimistic UI update
    const updated = current.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter(n => !n.isRead).length);

    // Call backend API to persist in database Notifications table
    if (numericId > 0) {
      this.http.post<any>(`${this.apiUrl}/Notification/MarkAsRead?id=${numericId}&employeeId=${empId}`, {}).pipe(
        catchError((err) => {
          console.warn('Error marking notification read on server:', err);
          return of({ success: false });
        })
      ).subscribe();
    }
  }

  markAllAsRead(): void {
    const current = this.notificationsSubject.getValue();
    const empId = this.getLoggedEmployeeId();

    // Optimistic UI update
    const updated = current.map(n => ({ ...n, isRead: true }));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);

    // Call backend API to persist all as read in database Notifications table
    this.http.post<any>(`${this.apiUrl}/Notification/MarkAllAsRead?employeeId=${empId}`, {}).pipe(
      catchError((err) => {
        console.warn('Error marking all notifications read on server:', err);
        return of({ success: false });
      })
    ).subscribe();
  }

  deleteNotification(notificationId: string): void {
    const current = this.notificationsSubject.getValue();
    const target = current.find(n => n.id === notificationId);
    const numericId = target?.backendId || Number(notificationId);
    const empId = this.getLoggedEmployeeId();

    // Optimistic UI update
    const updated = current.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter(n => !n.isRead).length);

    if (numericId > 0) {
      this.http.post<any>(`${this.apiUrl}/Notification/DeleteNotification?id=${numericId}&employeeId=${empId}`, {}).pipe(
        catchError((err) => {
          console.warn('Error deleting notification on server:', err);
          return of({ success: false });
        })
      ).subscribe();
    }
  }

  clearAllNotifications(): void {
    const empId = this.getLoggedEmployeeId();

    // Optimistic UI update
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);

    this.http.post<any>(`${this.apiUrl}/Notification/ClearAllNotifications?employeeId=${empId}`, {}).pipe(
      catchError((err) => {
        console.warn('Error clearing notifications on server:', err);
        return of({ success: false });
      })
    ).subscribe();
  }

  createNotification(notif: Partial<AppNotification>): Observable<any> {
    const payload = {
      employeeId: this.getLoggedEmployeeId(),
      title: notif.title,
      message: notif.message,
      category: notif.category || 'System',
      type: notif.type || 'info',
      icon: notif.icon || 'notifications',
      iconBg: notif.iconBg || '#eff6ff',
      iconColor: notif.iconColor || '#2563eb',
      route: notif.route || '/index/home',
      queryParams: notif.queryParams ? (typeof notif.queryParams === 'string' ? notif.queryParams : JSON.stringify(notif.queryParams)) : null
    };

    return this.http.post<any>(`${this.apiUrl}/Notification/CreateNotification`, payload).pipe(
      tap(() => this.refreshNotifications()),
      catchError((err) => {
        console.warn('Error creating notification in DB:', err);
        return of(null);
      })
    );
  }
}
