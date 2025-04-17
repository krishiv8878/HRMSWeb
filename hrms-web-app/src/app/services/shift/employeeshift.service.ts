import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeshiftService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor() { }

  getData() {
    return this.http.get<any[]>(this.apiUrl + `/Shift/GetAllShifts`);
  }

  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Shift/CreateShiftType/`, data);
  }
  updateData(data: any, shiftId:any) {
    return this.http.put<any[]>(this.apiUrl + `/Shift/UpdateShift/`+shiftId, data)
  }
  deleteData(shiftId: any) {
    return this.http.delete(this.apiUrl + `/Shift/DeleteShift/`+ shiftId)
  }
}
