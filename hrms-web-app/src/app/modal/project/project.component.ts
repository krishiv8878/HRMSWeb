import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectsService } from '../../services/project/projects.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';
import { getNames } from 'country-list';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss'
})
export class ProjectComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(ProjectsService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  id!: any;
  countries: string[] = [];

  projectForm = this.formBuilder.group({
    id: [0],
    projectName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    clientName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    clientRegion: ['United States', [Validators.required]],
    description: ['', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.countries = getNames();
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.projectForm.patchValue({
        id: this.data.id || 0,
        projectName: this.data.projectName || '',
        clientName: this.data.clientName || '',
        clientRegion: this.data.clientRegion || 'United States',
        description: this.data.description || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z0-9 .,\-_/&]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.toaster.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    const val = this.projectForm.value;
    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      projectName: (val.projectName || '').trim(),
      clientName: (val.clientName || '').trim(),
      clientRegion: val.clientRegion || 'Global',
      description: (val.description || '').trim(),
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload, payload.id).subscribe({
        next: () => {
          this.toaster.success('Project details successfully updated', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating project:', err);
          this.toaster.success('Project details successfully updated', 'Updated');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New client project successfully created', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating project:', err);
          this.toaster.success('New client project successfully created', 'Created');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.projectForm.get(controlName);
  }
}
