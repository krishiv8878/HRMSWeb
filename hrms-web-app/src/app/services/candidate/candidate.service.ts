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
}
