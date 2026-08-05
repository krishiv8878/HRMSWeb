import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { DocumentCategory, DocumentItem, AccessLevel, FileType } from '../../interface/document.interface';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  http = inject(HttpClient);
  apiUrl = environment.host;

  private initialCategories: DocumentCategory[] = [
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

  private categoriesSubject = new BehaviorSubject<DocumentCategory[]>(this.initialCategories);
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
      const storedName = localStorage.getItem('UserName') || localStorage.getItem('loggedUser') || localStorage.getItem('name');
      const storedPhoto = localStorage.getItem('profileImage') || localStorage.getItem('userAvatar') || localStorage.getItem('profilePic') || localStorage.getItem('photo');

      let avatarUrl: string | undefined = undefined;
      if (storedPhoto) {
        avatarUrl = storedPhoto.startsWith('http')
          ? storedPhoto
          : `${this.apiUrl.replace('/api', '')}/ProfileImages/${storedPhoto}`;
      }

      const name = storedName || 'Employee';
      const parts = name.trim().split(' ');
      const initials = parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();

      return { name, initials, avatar: avatarUrl };
    }

    return {
      name: 'Employee',
      initials: 'EMP',
      avatar: undefined
    };
  }

  fetchDocumentsFromApi() {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) return;

    this.http.get<any>(this.apiUrl + `/EmployeeDocument/GetAllDocumentsInfo`).pipe(
      catchError(err => of({ data: [] }))
    ).subscribe((response: any) => {
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        const loggedUser = this.getLoggedInUser();
        const apiDocs: DocumentItem[] = response.data.map((item: any) => {
          const filePath = item.filePath || item.documentName || 'Document';
          const ext = filePath.split('.').pop()?.toLowerCase() || 'pdf';
          let fileType: FileType = 'pdf';
          if (ext === 'docx' || ext === 'doc') fileType = 'docx';
          else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
          else if (ext === 'pptx' || ext === 'ppt') fileType = 'pptx';
          else if (ext === 'zip') fileType = 'zip';

          const empAvatar = item.profileImage
            ? `${this.apiUrl.replace('/api', '')}/ProfileImages/${item.profileImage}`
            : loggedUser.avatar;

          const empName = item.employeeName || loggedUser.name;
          const parts = empName.trim().split(' ');
          const empInitials = parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].substring(0, 2).toUpperCase();

          return {
            id: item.id ? String(item.id) : 'doc-' + Math.random(),
            name: item.documentName || filePath,
            fileType: fileType,
            category: item.category || 'Employee Docs',
            ownerName: empName,
            ownerAvatar: empAvatar,
            ownerInitials: empInitials,
            accessLevel: item.accessLevel || 'Public',
            lastModified: item.createdDate ? new Date(item.createdDate).toLocaleDateString() : new Date().toLocaleDateString(),
            fileSize: item.fileSize || '1.0 MB'
          };
        });

        this.documentsSubject.next(apiDocs);
        this.recalculateCategoryCounts(apiDocs);
      }
    });
  }

  private recalculateCategoryCounts(docs: DocumentItem[]) {
    const countsMap: { [catName: string]: number } = {};
    docs.forEach(doc => {
      const catLower = doc.category.toLowerCase();
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

  getMockDocuments(): Observable<DocumentItem[]> {
    return this.documents$;
  }

  addDocument(docData: { name: string; category: string; accessLevel: AccessLevel; file?: File }): DocumentItem {
    const ext = docData.file ? docData.file.name.split('.').pop()?.toLowerCase() || 'pdf' : 'pdf';
    let fileType: FileType = 'pdf';
    if (ext === 'docx' || ext === 'doc') fileType = 'docx';
    else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
    else if (ext === 'pptx' || ext === 'ppt') fileType = 'pptx';
    else if (ext === 'zip') fileType = 'zip';

    const fileSizeStr = docData.file
      ? (docData.file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : '1.2 MB';

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let fileObjectUrl: string | undefined = undefined;
    if (docData.file && typeof window !== 'undefined') {
      fileObjectUrl = URL.createObjectURL(docData.file);
    }

    const currentUser = this.getLoggedInUser();

    const newDoc: DocumentItem = {
      id: 'doc-' + Date.now(),
      name: docData.name.endsWith('.' + ext) ? docData.name : `${docData.name}.${ext}`,
      fileType: fileType,
      category: docData.category,
      ownerName: currentUser.name,
      ownerAvatar: currentUser.avatar,
      ownerInitials: currentUser.initials,
      accessLevel: docData.accessLevel || 'Public',
      lastModified: todayStr,
      fileSize: fileSizeStr,
      file: docData.file,
      fileUrl: fileObjectUrl
    };

    const currentDocs = this.documentsSubject.value;
    const updatedDocs = [newDoc, ...currentDocs];
    this.documentsSubject.next(updatedDocs);
    this.recalculateCategoryCounts(updatedDocs);

    return newDoc;
  }

  deleteDocument(id: string) {
    const docToDelete = this.documentsSubject.value.find(d => d.id === id);
    if (!docToDelete) return;

    if (docToDelete.fileUrl && typeof window !== 'undefined') {
      URL.revokeObjectURL(docToDelete.fileUrl);
    }

    const updatedDocs = this.documentsSubject.value.filter(d => d.id !== id);
    this.documentsSubject.next(updatedDocs);
    this.recalculateCategoryCounts(updatedDocs);
  }

  getAll() {
    return this.http.get<any[]>(this.apiUrl + `/EmployeeDocument/GetAllDocumentsInfo`);
  }

  creatDocument(formData: FormData): Observable<any> {
    const documentName = formData.get('documentName') as string;
    return this.http.post<any[]>(this.apiUrl + `/EmployeeDocument/UploadDocument?documentName=${encodeURIComponent(documentName)}`, formData).pipe(
      tap(() => console.log('API called')),
      catchError((error) => {
        console.error('Error from API service:', error);
        return throwError(() => error);
      })
    );
  }

  viewDocument(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/EmployeeDocument/view/${id}`, { responseType: 'blob' });
  }
}
