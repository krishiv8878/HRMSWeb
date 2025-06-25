import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
// import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { DocumentService } from '../../services/documnets/document.service';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatIcon, MatButton],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent {
  constructor(private dialog:MatDialogRef<DocumentsComponent>) { }
  services = inject(DocumentService)
  formbuilder = inject(FormBuilder)
  router = inject(Router)
  toster = inject(ToastrService)

  documentForm = this.formbuilder.group({
    documentName: ['', [Validators.required]],
    // filePath: ['']
  })

  selectedFile: File | null = null;
  selectedFileName: string = '';
  ngOnInit() {
    localStorage.getItem('employeeId')
  }

  // Handle file selection
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0]
  }

  // Submit form data + file using FormData
  onSubmit() {
    if (!this.documentForm.value || !this.selectedFile) return;
    const formData = new FormData();
    const documentName = this.documentForm.get('documentName')?.value?.trim();
    formData.append('documentName', documentName ?? '');
    formData.append('file', this.selectedFile);

    this.services.creatDocument(formData).subscribe({
      next: (val: any) => {
        this.toster.success('Document uploaded successfully!', 'Success');
        // this.documentForm.reset();
        // this.selectedFile = null;
        // this.selectedFileName = '';
        this.dialog.close(true)
      },
      error: (err) => {
        this.toster.error('Upload failed', 'Error');
        console.error('error', err);
      }
    });
  }
}
