// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class tokenInterceptor {
  private axiosInstance;
  apiUrl = environment.host
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl, // Replace with your API's base URL
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('LoginTokan');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor (optional)
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 401) {
          // Implement your 401 handling here
        }
        return Promise.reject(error);
      }
    );
  }

  getAxiosInstance() {
    return this.axiosInstance;
  }
}
