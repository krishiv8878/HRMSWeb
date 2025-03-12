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
    bankName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    ifscCode: ['', [Validators.required,Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$'),Validators.maxLength(11)]],
    accountNumber: ['', [Validators.required,Validators.pattern(('^[0-9]+$'))]],
    nameOnAccount: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    isActive: ['',[Validators.required, Validators.pattern('true|false')]]
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
    if (this.paymentinfo.invalid) {
      this.paymentinfo.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        bankName: "Bank Name is Required",
        ifscCode: "Please Enter A Valid IFSC Code",
        accountNumber: "Enter Account Number",
        nameOnAccount: "Enter Account Name",  
         isActive:" Please select a Active Button"
      };

      for (const field in errorMessages) {
        const control = this.paymentinfo.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
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
