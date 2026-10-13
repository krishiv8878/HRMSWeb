import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  draft?: ChatDraft | null;
  status?: 'pending' | 'confirmed' | 'cancelled';
  timestamp?: Date;
}

export interface ChatDraft {
  actionType: 'leave' | 'regularization' | string;
  summary: string;
  confirmEndpoint: string;
  payload: any;
}

export interface ChatResponse {
  reply: string;
  draft: ChatDraft | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.host; // e.g. "http://localhost:5220/api"

  /**
   * Send chat messages to the AI assistant backend
   */
  sendMessage(messages: { role: string; content: string }[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, { messages });
  }

  /**
   * Confirm and execute a prepared action draft
   */
  confirmDraft(endpoint: string, payload: any): Observable<any> {
    // Normalize endpoint url whether it includes "api/" prefix or not
    const cleanEndpoint = endpoint.startsWith('api/') ? endpoint.substring(4) : endpoint;
    const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${this.apiUrl}/${cleanEndpoint}`;
    return this.http.post<any>(url, payload);
  }

  /**
   * Explicitly request a leave application draft
   */
  prepareLeave(dto: any): Observable<ChatDraft> {
    return this.http.post<ChatDraft>(`${this.apiUrl}/chat/prepare-leave`, dto);
  }

  /**
   * Explicitly request an attendance regularization draft
   */
  prepareRegularization(dto: any): Observable<ChatDraft> {
    return this.http.post<ChatDraft>(`${this.apiUrl}/chat/prepare-regularization`, dto);
  }
}
