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

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatIcon, MatButton],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent {
  constructor() { }
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

  // Handle file selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
    }
  }

  // Submit form data + file using FormData
  onSubmit() {
    if (!this.documentForm.valid || !this.selectedFile) return;
    // debugger;
    if (this.documentForm.invalid) {
      return;
    }
    const formData = new FormData();
    formData.append('documentName', this.documentForm.value.documentName??'');
    formData.append('file', this.selectedFile);

    this.services.creatDocument(formData).subscribe({
      next: () => {
        this.toster.success('Document uploaded successfully!', 'Success');
        this.documentForm.reset();
        this.selectedFile = null;
        this.selectedFileName = '';
      },
      error: (err) => {
        this.toster.error('Upload failed', 'Error');
        console.error(err);
      }
    });
  }
}
