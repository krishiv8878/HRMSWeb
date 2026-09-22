import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmailTemplateService, EmailTemplateType } from '../../services/email-template/email-template.service';

export interface EmailTemplateTypeModalData {
  isEdit: boolean;
  item?: EmailTemplateType;
}

@Component({
  selector: 'app-email-template-type-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './email-template-type-modal.component.html',
  styleUrl: './email-template-type-modal.component.scss'
})
export class EmailTemplateTypeModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EmailTemplateTypeModalComponent>);
  public data: EmailTemplateTypeModalData = inject(MAT_DIALOG_DATA) || { isEdit: false };
  private templateService = inject(EmailTemplateService);
  private toastr = inject(ToastrService);

  typeForm!: FormGroup;
  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.typeForm = this.fb.group({
      templateType: [this.data.item?.templateType || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.data.item?.description || '', [Validators.required, Validators.maxLength(300)]]
    });
  }

  onSubmit(): void {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formVal = this.typeForm.value;

    if (this.data.isEdit && this.data.item) {
      const payload = {
        id: this.data.item.id,
        templateType: formVal.templateType.trim(),
        description: formVal.description.trim()
      };

      this.templateService.updateType(payload).subscribe({
        next: () => {
          this.toastr.success('Email Template Type updated successfully!', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || 'Failed to update email template type';
          this.toastr.error(msg, 'Error');
        }
      });
    } else {
      const payload = {
        templateType: formVal.templateType.trim(),
        description: formVal.description.trim()
      };

      this.templateService.addType(payload).subscribe({
        next: () => {
          this.toastr.success('Email Template Type created successfully!', 'Created');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || 'Failed to add email template type';
          this.toastr.error(msg, 'Error');
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
