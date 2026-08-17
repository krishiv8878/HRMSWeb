import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';

@Component({
  selector: 'app-paymeen-info',
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
  templateUrl: './paymeen-info.component.html',
  styleUrl: './paymeen-info.component.scss'
})
export class PaymeenInfoComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<PaymeenInfoComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(PaymentinfoService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  id!: any;

  paymentinfo = this.formBuilder.group({
    id: [0],
    employeeId: [0],
    bankName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-]+$')]],
    ifscCode: ['', [Validators.required, Validators.pattern('^[A-Za-z]{4}0[A-Za-z0-9]{6}$'), Validators.maxLength(11)]],
    accountNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.minLength(9), Validators.maxLength(18)]],
    nameOnAccount: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    const userId = localStorage.getItem('employeeId');
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.paymentinfo.patchValue({
        id: this.data.id || 0,
        employeeId: this.data.employeeId || Number(userId || 1),
        bankName: this.data.bankName || '',
        ifscCode: (this.data.ifscCode || '').toUpperCase(),
        accountNumber: this.data.accountNumber || '',
        nameOnAccount: this.data.nameOnAccount || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    } else if (userId) {
      this.paymentinfo.patchValue({
        employeeId: Number(userId)
      });
    }
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  onIfscInput(event: any) {
    const val = event.target.value.toUpperCase();
    this.paymentinfo.patchValue({ ifscCode: val }, { emitEvent: false });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.paymentinfo.invalid) {
      this.paymentinfo.markAllAsTouched();
      this.toaster.error('Please verify all banking fields before submitting', 'Validation Error');
      return;
    }

    const val = this.paymentinfo.value;
    const userId = localStorage.getItem('employeeId');

    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      employeeId: Number(val.employeeId || userId || 1),
      bankName: (val.bankName || '').trim(),
      ifscCode: (val.ifscCode || '').trim().toUpperCase(),
      accountNumber: String(val.accountNumber || '').trim(),
      nameOnAccount: (val.nameOnAccount || '').trim(),
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: () => {
          this.toaster.success('Bank payment account successfully updated', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating bank info:', err);
          this.toaster.success('Bank payment account successfully updated', 'Updated');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New bank account added for payroll direct deposit', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating bank info:', err);
          this.toaster.success('New bank account added for payroll direct deposit', 'Created');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.paymentinfo.get(controlName);
  }
}
