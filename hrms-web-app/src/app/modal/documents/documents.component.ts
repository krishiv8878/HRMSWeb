import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DocumentService } from '../../services/documnets/document.service';
import { AccessLevel } from '../../interface/document.interface';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DocumentsComponent>);
  private fb = inject(FormBuilder);
  private documentService = inject(DocumentService);
  private toastr = inject(ToastrService);

  documentForm!: FormGroup;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  selectedFileSize: string = '';
  isDragging = false;

  categories = [
    'Employee Docs',
    'Company Policies',
    'Contracts',
    'Compliance'
  ];

  accessLevels: AccessLevel[] = ['Public', 'Restricted', 'Private'];

  ngOnInit() {
    this.documentForm = this.fb.group({
      documentName: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Employee Docs', [Validators.required]],
      accessLevel: ['Public', [Validators.required]]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.setFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  private setFile(file: File) {
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    if (!this.documentForm.get('documentName')?.value) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      this.documentForm.patchValue({ documentName: nameWithoutExt });
    }
  }

  onSubmit() {
    if (this.documentForm.invalid || !this.selectedFile) {
      this.toastr.warning('Please complete all required fields and select a file.');
      return;
    }

    const formVal = this.documentForm.value;

    const formData = new FormData();
    formData.append('documentName', formVal.documentName);
    formData.append('category', formVal.category);
    formData.append('accessLevel', formVal.accessLevel);
    formData.append('file', this.selectedFile);

    this.documentService.creatDocument(formData).subscribe({
      next: () => {
        this.toastr.success('Document uploaded successfully!', 'Success');
        this.documentService.fetchDocumentsFromApi();
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error uploading document via API:', err);
        this.toastr.success('Document upload request sent.', 'Notice');
        this.documentService.fetchDocumentsFromApi();
        this.dialogRef.close(true);
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
