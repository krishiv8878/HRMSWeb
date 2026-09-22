import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmailTemplateType {
  id: number;
  templateType: string;
  description: string;
  createdDate?: string;
}

export interface EmailTemplate {
  id: number;
  emailTemplateTypeId: number;
  templateHtml: string;
  emailTemplateTypeMaster?: EmailTemplateType;
  createdDate?: string;
  modifiedDate?: string;
}

export interface VariableMeta {
  key: string;
  description: string;
  sample: string;
}

export interface EmailTriggerEvent {
  id: number;
  eventCode: string;
  eventName: string;
  category: string;
  description: string;
  availableVariablesJson: string;
  parsedVariables?: VariableMeta[];
  defaultSubject: string;
  activeTemplateId?: number | null;
  isEnabled: boolean;
  emailTemplate?: EmailTemplate;
}

export interface UpdateTriggerBindingDto {
  id: number;
  activeTemplateId: number | null;
  isEnabled: boolean;
  defaultSubject?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailTemplateService {
  private http = inject(HttpClient);
  private apiUrl = environment.host;

  // ================= EMAIL TEMPLATE TYPES =================

  getAllTypes(): Observable<EmailTemplateType[]> {
    return this.http.get<any>(`${this.apiUrl}/EmailTemplateType/GetAll`).pipe(
      map((res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res?.data && Array.isArray(res.data)) rawList = res.data;
        else if (res?.Data && Array.isArray(res.Data)) rawList = res.Data;
        else if (res?.result && Array.isArray(res.result)) rawList = res.result;

        return rawList.map((item: any) => ({
          id: Number(item.id ?? item.Id ?? 0),
          templateType: item.templateType ?? item.TemplateType ?? '',
          description: item.description ?? item.Description ?? '',
          createdDate: item.createdDate ?? item.CreatedDate
        }));
      }),
      catchError((err) => {
        console.error('Error fetching email template types:', err);
        return of([]);
      })
    );
  }

  addType(payload: { templateType: string; description: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/EmailTemplateType/AddEmailTemplateType`, payload);
  }

  updateType(payload: { id: number; templateType: string; description: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/EmailTemplateType/UpdateEmailTemplateType`, payload);
  }

  deleteType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/EmailTemplateType/DeleteEmailTemplateType?id=${id}`);
  }

  // ================= EMAIL TEMPLATES =================

  getAllTemplates(): Observable<EmailTemplate[]> {
    return this.http.get<any>(`${this.apiUrl}/EmailTemplate/GetAll`).pipe(
      map((res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res?.data && Array.isArray(res.data)) rawList = res.data;
        else if (res?.Data && Array.isArray(res.Data)) rawList = res.Data;
        else if (res?.result && Array.isArray(res.result)) rawList = res.result;

        return rawList.map((item: any) => ({
          id: Number(item.id ?? item.Id ?? 0),
          emailTemplateTypeId: Number(item.emailTemplateTypeId ?? item.EmailTemplateTypeId ?? 0),
          templateHtml: item.templateHtml ?? item.TemplateHtml ?? '',
          emailTemplateTypeMaster: item.emailTemplateTypeMaster ?? item.EmailTemplateTypeMaster,
          createdDate: item.createdDate ?? item.CreatedDate,
          modifiedDate: item.modifiedDate ?? item.UpdatedDate ?? item.ModifiedDate
        }));
      }),
      catchError((err) => {
        console.error('Error fetching email templates:', err);
        return of([]);
      })
    );
  }

  getByTemplateTypeId(templateTypeId: number): Observable<EmailTemplate | null> {
    return this.http.get<any>(`${this.apiUrl}/EmailTemplate/GetByTemplateTypeId?templateTypeId=${templateTypeId}`).pipe(
      map((res: any) => {
        const item = res?.data ?? res?.Data ?? (Array.isArray(res) ? res[0] : res);
        if (!item || typeof item !== 'object') return null;
        return {
          id: Number(item.id ?? item.Id ?? 0),
          emailTemplateTypeId: Number(item.emailTemplateTypeId ?? item.EmailTemplateTypeId ?? 0),
          templateHtml: item.templateHtml ?? item.TemplateHtml ?? '',
          emailTemplateTypeMaster: item.emailTemplateTypeMaster ?? item.EmailTemplateTypeMaster,
          createdDate: item.createdDate ?? item.CreatedDate,
          modifiedDate: item.modifiedDate ?? item.UpdatedDate ?? item.ModifiedDate
        };
      }),
      catchError((err) => {
        console.error('Error fetching template by type id:', err);
        return of(null);
      })
    );
  }

  addTemplate(payload: { emailTemplateTypeId: number; templateHtml: string }): Observable<any> {
    const body = {
      id: 0,
      emailTemplateTypeId: payload.emailTemplateTypeId,
      templateHtml: payload.templateHtml
    };
    return this.http.post<any>(`${this.apiUrl}/EmailTemplate/AddEmailTemplates`, body);
  }

  updateTemplate(payload: { id: number; emailTemplateTypeId: number; templateHtml: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/EmailTemplate/UpdateEmailTemplates`, payload);
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/EmailTemplate/DeleteemailTemplatesMaster/${id}`);
  }

  // ================= TRIGGER EVENT BINDINGS =================

  getAllTriggerEvents(): Observable<EmailTriggerEvent[]> {
    return this.http.get<any>(`${this.apiUrl}/EmailTriggerEvent/GetAll`).pipe(
      map((res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res?.data && Array.isArray(res.data)) rawList = res.data;
        else if (res?.Data && Array.isArray(res.Data)) rawList = res.Data;

        return rawList.map((item: any) => {
          let parsedVariables: VariableMeta[] = [];
          if (item.availableVariablesJson) {
            try {
              parsedVariables = JSON.parse(item.availableVariablesJson);
            } catch {
              parsedVariables = [];
            }
          }

          return {
            id: Number(item.id ?? item.Id ?? 0),
            eventCode: item.eventCode ?? item.EventCode ?? '',
            eventName: item.eventName ?? item.EventName ?? '',
            category: item.category ?? item.Category ?? 'General',
            description: item.description ?? item.Description ?? '',
            availableVariablesJson: item.availableVariablesJson ?? item.AvailableVariablesJson ?? '[]',
            parsedVariables: parsedVariables,
            defaultSubject: item.defaultSubject ?? item.DefaultSubject ?? '',
            activeTemplateId: item.activeTemplateId ?? item.ActiveTemplateId ?? null,
            isEnabled: item.isEnabled ?? item.IsEnabled ?? true,
            emailTemplate: item.emailTemplate ?? item.EmailTemplate
          };
        });
      }),
      catchError((err) => {
        console.warn('Could not fetch trigger events from backend API, using fallback defaults:', err);
        return of([]);
      })
    );
  }

  updateTriggerBinding(payload: UpdateTriggerBindingDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/EmailTriggerEvent/UpdateBinding`, payload);
  }

  sendTestEmail(eventCode: string, toEmail: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/EmailTriggerEvent/SendTestEmail`, {
      eventCode: eventCode,
      toEmail: toEmail
    });
  }

  seedDefaultEvents(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/EmailTriggerEvent/SeedDefaults`, {});
  }
}
