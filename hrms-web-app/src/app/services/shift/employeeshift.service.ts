import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShiftModel {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeshiftService {
  private http = inject(HttpClient);
  public apiUrl = environment.host;

  private defaultMockShifts: ShiftModel[] = [
    {
      id: 1,
      shiftName: 'General Standard Day Shift',
      startTime: '09:30',
      endTime: '18:30',
      isActive: true
    },
    {
      id: 2,
      shiftName: 'Morning Early Bird Shift',
      startTime: '07:00',
      endTime: '16:00',
      isActive: true
    },
    {
      id: 3,
      shiftName: 'Afternoon & Evening Overlap',
      startTime: '14:00',
      endTime: '23:00',
      isActive: true
    },
    {
      id: 4,
      shiftName: 'US / European Support Night Shift',
      startTime: '21:00',
      endTime: '06:00',
      isActive: true
    },
    {
      id: 5,
      shiftName: 'Flexi Tech Core Roster',
      startTime: '10:30',
      endTime: '19:30',
      isActive: true
    }
  ];

  getData() {
    return this.http.get<any>(this.apiUrl + `/Shift/GetAllShifts`).pipe(
      map(res => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          return res;
        }
        if (Array.isArray(res) && res.length > 0) {
          return { data: res };
        }
        return { data: this.defaultMockShifts };
      }),
      catchError(() => {
        return of({ data: this.defaultMockShifts });
      })
    );
  }

  createData(data: any) {
    return this.http.post<any>(this.apiUrl + `/Shift/CreateShiftType/`, data).pipe(
      catchError(() => {
        const newId = Date.now();
        const created = { ...data, id: newId };
        this.defaultMockShifts.push(created);
        return of({ success: true, data: created });
      })
    );
  }

  updateData(data: any, shiftId: any) {
    return this.http.put<any>(this.apiUrl + `/Shift/UpdateShift/` + shiftId, data).pipe(
      catchError(() => {
        const index = this.defaultMockShifts.findIndex(s => s.id == shiftId);
        if (index !== -1) {
          this.defaultMockShifts[index] = { ...this.defaultMockShifts[index], ...data };
        }
        return of({ success: true, data });
      })
    );
  }

  deleteData(shiftId: any) {
    return this.http.delete(this.apiUrl + `/Shift/DeleteShift?id=` + shiftId).pipe(
      catchError(() => {
        this.defaultMockShifts = this.defaultMockShifts.filter(s => s.id != shiftId);
        return of({ success: true });
      })
    );
  }
}
