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
    filePath: ['']
  })
  onSubmit() {
    this.services.creatDocument(this.documentForm.value).subscribe({
      next: (val) => {
        this.toster.success('Designation Recode Successfully Added', 'success')
      }
    })
  }
}
