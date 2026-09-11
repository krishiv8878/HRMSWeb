import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { DocumentCategory, DocumentItem, AccessLevel, FileType, DocumentStatus } from '../../interface/document.interface';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private defaultCategories: DocumentCategory[] = [
    {
      id: 'cat-1',
      title: 'Employee Docs',
      description: 'Resumes, ID proofs, performance reviews.',
      fileCount: 0,
      iconName: 'folder_shared',
      theme: 'blue'
    },
    {
      id: 'cat-2',
      title: 'Company Policies',
      description: 'Handbooks, IT guidelines, HR rules.',
      fileCount: 0,
      iconName: 'verified_user',
      theme: 'emerald'
    },
    {
      id: 'cat-3',
      title: 'Contracts',
      description: 'Vendor agreements, NDAs, client Memos.',
      fileCount: 0,
      iconName: 'assignment',
      theme: 'indigo'
    },
    {
      id: 'cat-4',
      title: 'Compliance',
      description: 'Audit reports, tax forms, certifications.',
      fileCount: 0,
      iconName: 'fact_check',
      theme: 'rose'
    }
  ];

  private categoriesSubject = new BehaviorSubject<DocumentCategory[]>(this.defaultCategories);
  private documentsSubject = new BehaviorSubject<DocumentItem[]>([]);
  private searchQuerySubject = new BehaviorSubject<string>('');

  categories$: Observable<DocumentCategory[]> = this.categoriesSubject.asObservable();
  documents$: Observable<DocumentItem[]> = this.documentsSubject.asObservable();
  searchQuery$: Observable<string> = this.searchQuerySubject.asObservable();

  constructor() {
    this.fetchDocumentsFromApi();
  }

  setSearchQuery(query: string) {
    this.searchQuerySubject.next(query);
  }

  getSearchQuery(): string {
    return this.searchQuerySubject.value;
  }

  getLoggedInUser(): { name: string; initials: string; avatar?: string } {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const fn = (localStorage.getItem('firstName') || '').trim();
      const ln = (localStorage.getItem('lastName') || '').trim();
      const combo = (fn || ln) ? `${fn} ${ln}`.trim() : '';

      const storedName = combo ||
                         localStorage.getItem('userName') ||
                         localStorage.getItem('fullName') ||
                         localStorage.getItem('employeeName') ||
                         localStorage.getItem('UserName') ||
                         localStorage.getItem('loggedUser') ||
                         localStorage.getItem('name');

      const storedPhoto = localStorage.getItem('profileImage') || localStorage.getItem('userAvatar') || localStorage.getItem('profilePic') || localStorage.getItem('photo');

      let avatarUrl: string | undefined = undefined;
      if (storedPhoto) {
        avatarUrl = storedPhoto.startsWith('http') || storedPhoto.startsWith('data:')
          ? storedPhoto
          : `${this.apiUrl.replace('/api', '')}/ProfileImages/${storedPhoto}`;
      }

      const name = storedName || 'Employee';
      const parts = name.trim().split(/\s+/);
      const initials = parts.length > 1 && parts[0] && parts[1]
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'EP');

      return { name, initials, avatar: avatarUrl };
    }

    return {
      name: 'Employee',
      initials: 'EMP',
      avatar: undefined
    };
  }

  // Pure API method fetching documents directly from DB
  getAll(): Observable<any> {
    return this.http.get<any[]>(this.apiUrl + `/EmployeeDocument/GetAllDocumentsInfo`);
  }

  fetchDocumentsFromApi() {
    const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    if (!isBrowser) return;

    this.getAll().pipe(
      catchError(() => of({ data: [] }))
    ).subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        } else if (response && Array.isArray(response.result)) {
          rawList = response.result;
        }

        const validList = rawList.filter((item: any) => !item.isDeleted && item.isDeleted !== 1 && item.isDeleted !== 'true');
        const loggedUser = this.getLoggedInUser();
        let apiDocs: DocumentItem[] = [];

        if (validList.length > 0) {
          apiDocs = validList.map((item: any) => {
            const filePath = item.filePath || item.documentName || item.name || 'Document';
            const ext = filePath.split('.').pop()?.toLowerCase() || 'pdf';
            let fileType: FileType = 'pdf';
            if (ext === 'docx' || ext === 'doc') fileType = 'docx';
            else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
            else if (ext === 'pptx' || ext === 'ppt') fileType = 'pptx';
            else if (ext === 'zip') fileType = 'zip';

            const empAvatar = item.profileImage
              ? `${this.apiUrl.replace('/api', '')}/ProfileImages/${item.profileImage}`
              : loggedUser.avatar;

            const empName = item.employeeName || item.ownerName || loggedUser.name;
            const parts = empName.trim().split(' ');
            const empInitials = parts.length > 1
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : parts[0].substring(0, 2).toUpperCase();

            let status: DocumentStatus = 'Approved';
            if (item.status) {
              const rawStatus = String(item.status).trim();
              if (rawStatus.toLowerCase() === 'pending') status = 'Pending';
              else if (rawStatus.toLowerCase() === 'rejected') status = 'Rejected';
              else if (rawStatus.toLowerCase() === 'approved') status = 'Approved';
            }

            return {
              id: item.id ? String(item.id) : 'doc-' + Math.random(),
              name: item.documentName || item.name || filePath,
              fileType: fileType,
              category: item.category || item.Category || 'Employee Docs',
              ownerName: empName,
              ownerAvatar: empAvatar,
              ownerInitials: empInitials,
              accessLevel: (item.accessLevel as AccessLevel) || 'Public',
              lastModified: (item.uploadedDate || item.UploadedDate || item.createdDate || item.CreatedDate || item.lastModified) 
                ? new Date(item.uploadedDate || item.UploadedDate || item.createdDate || item.CreatedDate || item.lastModified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              fileSize: item.fileSize || '1.0 MB',
              isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
              status: status,
              rejectionReason: item.rejectionReason || item.RejectionReason || undefined,
              actionBy: item.actionBy || item.ActionBy || undefined,
              actionDate: item.actionDate || item.ActionDate || undefined,
              employeeId: item.employeeId || item.EmployeeId || undefined
            };
          });
        } else if (rawList.length > 0) {
          apiDocs = [];
        } else {
          apiDocs = this.getDefaultFallbackDocs();
        }

        this.documentsSubject.next(apiDocs);
        this.recalculateCategoryCounts(apiDocs);
      },
      error: () => {
        const fallback = this.getDefaultFallbackDocs();
        this.documentsSubject.next(fallback);
        this.recalculateCategoryCounts(fallback);
      }
    });
  }

  private getDefaultFallbackDocs(): DocumentItem[] {
    const loggedUser = this.getLoggedInUser();
    return [
      {
        id: 'doc-1',
        name: 'Employee_Handbook_2026.pdf',
        fileType: 'pdf',
        category: 'Company Policies',
        ownerName: loggedUser.name,
        ownerAvatar: loggedUser.avatar,
        ownerInitials: loggedUser.initials,
        accessLevel: 'Public',
        lastModified: new Date().toLocaleDateString(),
        fileSize: '2.4 MB',
        isActive: true
      },
      {
        id: 'doc-2',
        name: 'Employment_Contract_Standard.docx',
        fileType: 'docx',
        category: 'Contracts',
        ownerName: loggedUser.name,
        ownerAvatar: loggedUser.avatar,
        ownerInitials: loggedUser.initials,
        accessLevel: 'Restricted',
        lastModified: new Date().toLocaleDateString(),
        fileSize: '1.1 MB',
        isActive: true
      }
    ];
  }

  private recalculateCategoryCounts(docs: DocumentItem[]) {
    const countsMap: { [catName: string]: number } = {};
    docs.forEach(doc => {
      const catLower = (doc.category || '').toLowerCase();
      countsMap[catLower] = (countsMap[catLower] || 0) + 1;
    });

    const updatedCats = this.categoriesSubject.value.map(cat => ({
      ...cat,
      fileCount: countsMap[cat.title.toLowerCase()] || 0
    }));

    this.categoriesSubject.next(updatedCats);
  }

  getCategories(): Observable<DocumentCategory[]> {
    return this.categories$;
  }

  creatDocument(formData: FormData): Observable<any> {
    const documentName = formData.get('documentName') as string || '';
    return this.http.post<any[]>(this.apiUrl + `/EmployeeDocument/UploadDocument?documentName=${encodeURIComponent(documentName)}`, formData).pipe(
      tap(() => {
        this.fetchDocumentsFromApi();
      }),
      catchError((error) => {
        console.error('Error from UploadDocument API service:', error);
        return throwError(() => error);
      })
    );
  }

  toggleDocumentActive(id: string): boolean {
    const currentDocs = this.documentsSubject.value;
    let targetActiveState = false;

    const updatedDocs = currentDocs.map(doc => {
      if (doc.id === id) {
        targetActiveState = doc.isActive === false ? true : false;
        return { ...doc, isActive: targetActiveState };
      }
      return doc;
    });

    this.documentsSubject.next(updatedDocs);
    return targetActiveState;
  }

  deleteDocument(id: string): Observable<any> {
    const numericId = parseInt(id.replace(/\D/g, ''), 10) || Number(id) || 0;
    return this.http.delete<any>(`${this.apiUrl}/EmployeeDocument/DeleteDocument/${numericId}`).pipe(
      catchError(() => this.http.delete<any>(`${this.apiUrl}/EmployeeDocument/DeleteDocument?id=${numericId}`)),
      tap(() => {
        const updated = this.documentsSubject.value.filter(d => d.id !== id);
        this.documentsSubject.next(updated);
        this.recalculateCategoryCounts(updated);
      })
    );
  }

  viewDocument(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/EmployeeDocument/view/${id}`, { responseType: 'blob' });
  }

  approveOrRejectDocument(id: number | string, status: 'Approved' | 'Rejected', rejectionReason?: string): Observable<any> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10) || 0;
    const payload = {
      id: numericId,
      status: status,
      rejectionReason: status === 'Rejected' ? (rejectionReason || null) : null
    };

    return this.http.post<any>(`${this.apiUrl}/EmployeeDocument/ApproveOrRejectDocument`, payload).pipe(
      tap(() => {
        this.fetchDocumentsFromApi();
      })
    );
  }
}
