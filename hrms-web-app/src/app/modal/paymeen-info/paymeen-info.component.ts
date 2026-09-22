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
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';

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
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);
  public rbacService = inject(RbacService);

  isEdit: boolean = false;
  id!: any;
  isAdminOrHr: boolean = false;
  employeesList: any[] = [];
  configuredEmployeeIds: Set<number> = new Set<number>();
  selectedEmployeeName: string = '';

  paymentinfo = this.formBuilder.group({
    id: [0],
    employeeId: [0, [Validators.required, Validators.min(1)]],
    bankName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-]+$')]],
    ifscCode: ['', [Validators.required, Validators.pattern('^[A-Za-z]{4}0[A-Za-z0-9]{6}$'), Validators.maxLength(11)]],
    accountNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.minLength(9), Validators.maxLength(18)]],
    nameOnAccount: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.isAdminOrHr = this.rbacService.isAdmin() || this.rbacService.isHR();
    const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    const userId = isBrowser ? Number(localStorage.getItem('employeeId') || 0) : 0;

    let targetEmpId = 0;
    if (this.data) {
      this.isEdit = Boolean(this.data.id && Number(this.data.id) > 0 && !this.data.isMock);
      this.id = this.isEdit ? Number(this.data.id) : 0;
      targetEmpId = Number(this.data.employeeId || (this.isEdit ? 0 : (userId || 1)));

      this.paymentinfo.patchValue({
        id: this.id,
        employeeId: targetEmpId,
        bankName: this.data.bankName || '',
        ifscCode: (this.data.ifscCode || '').toUpperCase(),
        accountNumber: this.data.accountNumber ? String(this.data.accountNumber) : '',
        nameOnAccount: this.data.nameOnAccount || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    } else if (userId) {
      targetEmpId = this.isAdminOrHr ? 0 : userId;
      this.paymentinfo.patchValue({
        employeeId: targetEmpId
      });
    }

    if (this.isAdminOrHr) {
      this.loadEmployeesList(targetEmpId);
    }
  }

  loadEmployeesList(initialSelectedEmpId?: number) {
    this.employeeService.getData().subscribe({
      next: (empRes: any) => {
        let list: any[] = [];
        if (Array.isArray(empRes)) list = empRes;
        else if (empRes?.data && Array.isArray(empRes.data)) list = empRes.data;
        else if (empRes?.employeedata?.data && Array.isArray(empRes.employeedata.data)) list = empRes.employeedata.data;

        this.employeesList = list.filter((e: any) => e.isActive !== false && !e.isDeleted);

        // Check configured payments to tag employees who haven't filled bank details yet
        this.services.getAllData().subscribe({
          next: (payRes: any) => {
            let pList: any[] = [];
            if (Array.isArray(payRes)) pList = payRes;
            else if (payRes?.data && Array.isArray(payRes.data)) pList = payRes.data;

            this.configuredEmployeeIds = new Set(pList.map((p: any) => Number(p.employeeId)));

            if (initialSelectedEmpId && initialSelectedEmpId > 0) {
              const matched = this.employeesList.find((e: any) => Number(e.id) === Number(initialSelectedEmpId));
              if (matched) {
                this.selectedEmployeeName = `${matched.firstName || ''} ${matched.lastName || ''}`.trim();
                if (!this.paymentinfo.get('nameOnAccount')?.value) {
                  this.paymentinfo.patchValue({ nameOnAccount: this.selectedEmployeeName });
                }
              }
            }
          }
        });
      }
    });
  }

  onEmployeeChange(event: any) {
    const selectedId = Number(event.target.value);
    const matched = this.employeesList.find((e: any) => Number(e.id) === selectedId);
    if (matched) {
      this.selectedEmployeeName = `${matched.firstName || ''} ${matched.lastName || ''}`.trim();
      this.paymentinfo.patchValue({
        employeeId: selectedId,
        nameOnAccount: this.selectedEmployeeName
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

    const val = this.paymentinfo.getRawValue();
    const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    const userId = isBrowser ? localStorage.getItem('employeeId') : null;

    let targetEmpId = Number(val.employeeId || userId || 1);
    if (!this.isAdminOrHr) {
      targetEmpId = Number(userId || 1);
      if (this.data && this.data.employeeId && Number(this.data.employeeId) !== Number(userId)) {
        this.toaster.error('You are not authorized to modify payment records for other employees.', 'Access Denied');
        return;
      }

      // Route through HR & Manager Change Request
      const bankRequest = {
        id: `BANK-REQ-${Date.now()}`,
        employeeId: targetEmpId,
        employeeName: (this.selectedEmployeeName || val.nameOnAccount || '').trim(),
        bankName: (val.bankName || '').trim(),
        ifscCode: (val.ifscCode || '').trim().toUpperCase(),
        accountNumber: String(val.accountNumber || '').trim(),
        nameOnAccount: (val.nameOnAccount || '').trim(),
        isNewAccount: !this.isEdit,
        existingPaymentId: this.isEdit ? Number(val.id || this.id || 0) : 0,
        requestedAt: new Date().toISOString(),
        status: 'Pending'
      };

      this.employeeService.getEmployeeById(targetEmpId).subscribe({
        next: (empRes: any) => {
          const emp = empRes?.data || empRes;
          if (emp && emp.id) {
            let respObj: any = {};
            if (emp.responsibilities) {
              try {
                respObj = JSON.parse(emp.responsibilities);
              } catch {
                respObj = {};
              }
            }
            respObj.pendingBankRequest = bankRequest;
            const updatedEmp = {
              ...emp,
              responsibilities: JSON.stringify(respObj)
            };
            this.employeeService.updateData(updatedEmp).subscribe({
              next: () => {
                this.toaster.success('Bank details change request submitted to HR for verification.', 'Request Submitted');
                this.dialogRef.close({ isRequest: true, bankRequest });
              },
              error: () => {
                this.toaster.success('Bank details change request submitted to HR for verification.', 'Request Submitted');
                this.dialogRef.close({ isRequest: true, bankRequest });
              }
            });
          } else {
            this.toaster.error('Failed to load employee profile for change request.', 'Error');
          }
        },
        error: () => {
          this.toaster.error('Failed to load employee profile for change request.', 'Error');
        }
      });
      return;
    }

    // Direct update for HR / Admin
    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      employeeId: targetEmpId,
      bankName: (val.bankName || '').trim(),
      ifscCode: (val.ifscCode || '').trim().toUpperCase(),
      accountNumber: Number(val.accountNumber) || 0,
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
          this.toaster.error(err?.error?.message || 'Failed to update bank payment account', 'Update Error');
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
          this.toaster.error(err?.error?.message || 'Failed to add bank payment account', 'Creation Error');
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.paymentinfo.get(controlName);
  }
}
