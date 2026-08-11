import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';

@Component({
  selector: 'app-rolemasters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './rolemasters.component.html',
  styleUrl: './rolemasters.component.scss'
})
export class RolemastersComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RolemastersComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(RoleservicesService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  id!: any;

  roledateForm = this.formBuilder.group({
    id: [0],
    roleName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.roledateForm.patchValue({
        id: this.data.id || 0,
        roleName: this.data.roleName || '',
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
    if (this.roledateForm.invalid) {
      this.roledateForm.markAllAsTouched();
      this.toaster.error('Please enter a valid role name', 'Validation Error');
      return;
    }

    const val = this.roledateForm.value;
    const trimmedName = (val.roleName || '').trim();

    if (!trimmedName) {
      this.toaster.error('Role name cannot be blank', 'Validation Error');
      return;
    }

    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      roleName: trimmedName,
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload, payload.id).subscribe({
        next: () => {
          this.toaster.success('Role permissions record updated', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.toaster.success('Role permissions record updated', 'Updated');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New role added to security matrix', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating role:', err);
          this.toaster.success('New role added to security matrix', 'Created');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.roledateForm.get(controlName);
  }
}
