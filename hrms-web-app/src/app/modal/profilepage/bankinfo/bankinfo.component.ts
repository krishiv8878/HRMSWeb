import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
// import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaymentinfoService } from '../../../services/employeePayment/paymentinfo.service';

@Component({
  selector: 'app-bankinfo',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatSelectModule, MatButton, ReactiveFormsModule],
  templateUrl: './bankinfo.component.html',
  styleUrl: './bankinfo.component.scss'
})
export class BankinfoComponent {
  constructor(private dialogref: MatDialogRef<BankinfoComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }
  // services = inject(EmployeeService)
  // paymentservices = inject(PaymentinfoService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  
  bankinfo = this.formbuilder.group({
    // nameOnAccount: [''],
    // accountNumber: [''],
    // bankName: [''],
    // ifscCode: [''],
  })
  ngOnInit() {
    this.bankinfo.patchValue(this.data)
  }
  submitbankinfo() {
    // this.paymentservices.updateData(this.bankinfo.value).subscribe({
    //   next: () => {
    //     this.toaster.success('Recode Successfully Added')
    //     this.dialogref.close(true)
    //   }, error: (err) => {
    //     console.log("invalid data", err)
    //   }
    // })
  }
}
