import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  apiUrl = environment.host;
  http = inject(HttpClient);

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/Candidate/GetCandidates").pipe(
      catchError((err) => {
        console.error('Error fetching candidates from database:', err);
        return of({ data: [] });
      })
    );
  }

  createData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + `/Candidate/AddCandidate`, data);
  }

  updateData(data: any): Observable<any> {
    const id = data.id || data.candidateId || 0;
    return this.http.put<any>(this.apiUrl + `/Candidate/UpdateCandidate`, data).pipe(
      catchError(() => {
        return this.http.put<any>(this.apiUrl + `/Candidate/UpdateCandidate/${id}`, data).pipe(
          catchError(() => {
            return this.http.post<any>(this.apiUrl + `/Candidate/UpdateCandidate`, data);
          })
        );
      })
    );
  }

  UpdateData(data: any, id?: any): Observable<any> {
    return this.updateData(data);
  }

  DeleteData(candidateId: any): Observable<any> {
    const id = Number(candidateId || 0);
    return this.http.delete<any>(this.apiUrl + `/Candidate/DeleteCandidate/${id}`).pipe(
      catchError(() => this.http.delete<any>(this.apiUrl + `/Candidate/DeleteCandidate?candidateId=${id}`))
    );
  }
}
