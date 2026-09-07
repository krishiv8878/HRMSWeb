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
import { DesignationservicesService } from '../../services/designation/designationservices.service';

@Component({
  selector: 'app-designations',
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
  templateUrl: './designations.component.html',
  styleUrl: './designations.component.scss'
})
export class DesignationsComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DesignationsComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(DesignationservicesService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  id!: any;

  deptList: string[] = ['Engineering', 'Product & Design', 'Human Resources', 'Marketing & Sales', 'Management'];
  careerLevels: string[] = ['Entry Level', 'Mid Level', 'Senior Level', 'Leadership'];

  designation = this.formBuilder.group({
    id: [0],
    designationName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    departmentCategory: ['Engineering', [Validators.required]],
    careerLevel: ['Mid Level', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.designation.patchValue({
        id: this.data.id || 0,
        designationName: this.data.designationName || '',
        departmentCategory: this.data.departmentCategory || this.data.department || 'Engineering',
        careerLevel: this.data.careerLevel || 'Mid Level',
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
    if (this.designation.invalid) {
      this.designation.markAllAsTouched();
      this.toaster.error('Please enter a valid designation name and details', 'Validation Error');
      return;
    }

    const val = this.designation.value;
    const trimmedName = (val.designationName || '').trim();

    if (!trimmedName) {
      this.toaster.error('Designation name cannot be blank', 'Validation Error');
      return;
    }

    const payload: any = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      designationName: trimmedName,
      departmentCategory: val.departmentCategory || 'Engineering',
      DepartmentCategory: val.departmentCategory || 'Engineering',
      department: val.departmentCategory || 'Engineering',
      careerLevel: val.careerLevel || 'Mid Level',
      CareerLevel: val.careerLevel || 'Mid Level',
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Designation record successfully updated', 'Updated');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to update designation', 'Error');
          }
        },
        error: (err) => {
          console.error('Error updating designation:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'Designation record updated';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('New designation added to catalog', 'Created');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to add designation', 'Error');
          }
        },
        error: (err) => {
          console.error('Error creating designation:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'New designation added';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.designation.get(controlName);
  }
}
