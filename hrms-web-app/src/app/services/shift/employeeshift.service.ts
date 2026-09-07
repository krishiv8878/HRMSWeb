import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShiftModel {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  assignedCount?: number;
  rawRecord?: any;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeshiftService {
  private http = inject(HttpClient);
  public apiUrl = environment.host;

  getData() {
    return this.http.get<any>(this.apiUrl + `/Shift/GetAllShifts`).pipe(
      catchError(() => {
        return this.http.get<any>(this.apiUrl + `/Shift/GetShifts`).pipe(
          catchError((err) => {
            console.error('Error fetching shifts from database:', err);
            return of({ data: [] });
          })
        );
      })
    );
  }

  createData(data: any) {
    return this.http.post<any>(this.apiUrl + `/Shift/CreateShiftType`, data).pipe(
      catchError(() => {
        return this.http.post<any>(this.apiUrl + `/Shift/AddShift`, data);
      })
    );
  }

  updateData(data: any, shiftId: any) {
    return this.http.put<any>(this.apiUrl + `/Shift/UpdateShift/` + shiftId, data).pipe(
      catchError(() => {
        return this.http.put<any>(this.apiUrl + `/Shift/UpdateShift`, data).pipe(
          catchError(() => {
            return this.http.post<any>(this.apiUrl + `/Shift/UpdateShift`, data);
          })
        );
      })
    );
  }

  deleteData(shiftId: any) {
    return this.http.delete<any>(this.apiUrl + `/Shift/DeleteShift?id=` + shiftId).pipe(
      catchError(() => {
        return this.http.delete<any>(this.apiUrl + `/Shift/DeleteShift?shiftId=` + shiftId);
      })
    );
  }
}
