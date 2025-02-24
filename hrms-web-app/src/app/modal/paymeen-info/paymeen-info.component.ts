import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-paymeen-info',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, CommonModule, FormsModule, MatCheckboxModule, MatDialogClose],
  templateUrl: './paymeen-info.component.html',
  styleUrl: './paymeen-info.component.scss'
})
export class PaymeenInfoComponent {
  constructor(private _dialogref: MatDialogRef<PaymeenInfoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  formBuilder = inject(FormBuilder)
  services = inject(PaymentinfoService)
  route = inject(ActivatedRoute)
  router = inject(Router)
  toaster = inject(ToastrService)
  isEdit = false;

  paymentinfo = this.formBuilder.group({
    id: 0,
    bankName: ['', [Validators.required]],
    ifscCode: ['', [Validators.required]],
    accountNumber: ['', [Validators.required]],
    nameOnAccount: ['', [Validators.required]],
    isActive: ['']
  })
  
  id!: any;

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      console.log('Payment ID:', this.id);
      this.paymentinfo.patchValue(this.data);
    }
  }
  submitdata() {
    if (this.isEdit) {
      this.services.updateData(this.paymentinfo.value, this.id).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.paymentinfo.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success('successfully add data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }

  getControl(controleName: string) {
    return this.paymentinfo.get(controleName);
  }
}
