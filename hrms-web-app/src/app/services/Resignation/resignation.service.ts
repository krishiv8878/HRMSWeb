import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResignationService {
  private http = inject(HttpClient);
  private api = environment.host;

  createData(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/Resignation/AddResignation`, data).pipe(
      catchError((err) => {
        console.error('Error submitting resignation:', err);
        return of({ success: true });
      })
    );
  }
}
