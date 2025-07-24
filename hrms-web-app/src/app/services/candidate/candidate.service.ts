import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import axios from 'axios';
import { error } from 'console';
import { tokenInterceptor } from '../tokenInterceptor/tokeninterceptor.service';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  constructor(private tokenInterceptor : tokenInterceptor) { }
  apiUrl = environment.host
  http = inject(HttpClient)


  // async getDatas(){
  //   // axios.get(this.apiUrl+'/Candidate/GetCandidates')
  //   // .then(res => {
  //   //   console.log(res.data);
  //   //   return res;
  //   // }).catch(error=>{
  //   //   console.log(error);
  //   // });
  //   return await axios.get(this.apiUrl+'/Candidate/GetCandidates').then(response =>{ return response.data});
  // }
  async getData() {
    return await this.tokenInterceptor.getAxiosInstance().get(this.apiUrl + "/Candidate/GetCandidates").then(response =>{ return response.data});
  }
  async createData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().post(this.apiUrl + `/Candidate/AddCandidate`, data).then(response =>{ return response.data});
  }
  async updateData(data: any) {
    return await this.tokenInterceptor.getAxiosInstance().put(this.apiUrl + `/Candidate/UpdateCandidate/`, data).then(response =>{ return response.data});
  }
  async DeleteData(candidateId: any) {
    return await this.tokenInterceptor.getAxiosInstance().delete(this.apiUrl + `/Candidate/DeleteCandidate?candidateId=`+ candidateId).then(response =>{ return response.data});
  }
}
