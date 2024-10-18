import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  constructor() { }
  apiUrl = environment.host
  http = inject(HttpClient)

  getData() {
    return this.http.get<any[]>(this.apiUrl + "/Candidate/GetCandidates")
  }
  createData(data: any) {
    return this.http.post<any[]>(this.apiUrl + `/Candidate/AddCandidate`, data)
  }
  updateData(data: any) {
    return this.http.put<any[]>(this.apiUrl + `/Candidate/UpdateCandidate/`, data);
  }
  DeleteData(candidateId: any) {
    return this.http.delete(this.apiUrl + `/Candidate/DeleteCandidate?candidateId=`+ candidateId);
  }
}
