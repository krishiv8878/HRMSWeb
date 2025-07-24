import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeshiftService {
  http = inject(HttpClient)
  apiUrl = environment.host;
  constructor(private tokenInterceptor :  tokenInterceptor) { }

  async getData() {
    return this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + `/Shift/GetAllShifts`).then(response =>{ return response.data});
  }

  async createData(data: any) {
    return this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/Shift/CreateShiftType/`, data).then(response =>{ return response.data});
  }
  async updateData(data: any, shiftId:any) {
    return this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/Shift/UpdateShift/`+shiftId, data).then(response =>{ return response.data});
  }
  async deleteData(shiftId: any) {
    return this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/Shift/DeleteShift?id=`+ shiftId).then(response =>{ return response.data});
  }
}
