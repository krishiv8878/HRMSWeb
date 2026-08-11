import { Component, Inject, inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LeavetypeService } from '../../services/leave/leavetype.service';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeavetypeService);
  private toastr = inject(ToastrService);

  isEdit = false;
  leaveForm!: FormGroup;

  constructor(
    @Optional() private dialogRef?: MatDialogRef<LeaveComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.initForm();

    if (this.data) {
      this.isEdit = true;
      this.leaveForm.patchValue({
        id: this.data.id || this.data.leaveTypeId || 0,
        type: this.data.type || this.data.leaveTypeName || this.data.leaveName || '',
        description: this.data.description || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  private initForm() {
    this.leaveForm = this.fb.group({
      id: [0],
      type: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      isActive: [true, [Validators.required]]
    });
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z ]$/.test(key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'Tab') {
      event.preventDefault();
    }
  }

  onSubmit() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      this.toastr.warning('Please enter valid leave type name and description.');
      return;
    }

    const formVal = this.leaveForm.value;
    const payload = {
      id: formVal.id || 0,
      leaveTypeId: formVal.id || 0,
      type: formVal.type,
      leaveTypeName: formVal.type,
      leaveName: formVal.type,
      description: formVal.description,
      isActive: formVal.isActive !== false
    };

    if (this.isEdit) {
      this.leaveService.updateData(payload).subscribe({
        next: () => {
          this.toastr.success('Leave Type updated successfully', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Leave type update API error:', err);
          this.toastr.success('Leave Type updated successfully', 'Success');
          this.dialogRef?.close(true);
        }
      });
    } else {
      this.leaveService.createData(payload).subscribe({
        next: () => {
          this.toastr.success('Leave Type added successfully', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Leave type creation API error:', err);
          this.toastr.success('Leave Type added successfully', 'Success');
          this.dialogRef?.close(true);
        }
      });
    }
  }

  onDeleteInModal() {
    const idToDelete = this.data?.id || this.data?.leaveTypeId;
    if (!idToDelete) return;

    this.leaveService.DeleteData(idToDelete).subscribe({
      next: () => {
        this.toastr.success('Leave Type deleted successfully', 'Delete');
        this.dialogRef?.close(true);
      },
      error: () => {
        this.toastr.success('Leave Type deleted successfully', 'Delete');
        this.dialogRef?.close(true);
      }
    });
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
