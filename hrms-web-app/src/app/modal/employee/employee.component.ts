import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { EmployeeService } from '../../services/employee/employee.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule,CommonModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss'
})
export class EmployeeComponent {

  constructor() { }
  formBuilder = inject(FormBuilder)
  services = inject(EmployeeService)
  route = inject(ActivatedRoute)
  data: any;
  employeeId!: number;


  employeeform = this.formBuilder.group({
    id: 0,
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    emailAddress: ['', [Validators.required]],
    mobileNumber: ['', [Validators.required]],
    address: ['', [Validators.required]]
  })

  ngOnInit() {
    // this.employeeId = this.route.snapshot.params['id'];
    // console.log("define id", this.employeeId)
    // if (this.employeeId!>0) {
    //   this.services.getData(this.data).subscribe((res:any) => {
    //     this.employeeform.setValue(res)
    //     console.log("result data", res)
    //   })
    // }else{
    //  console.log("data not found")
    // }
  }

  submitdata() {
    const employee: any = {
      firstName: this.employeeform.value.firstName!,
      lastName: this.employeeform.value.lastName!,
      emailAddress: this.employeeform.value.emailAddress!,
      mobileNumber: this.employeeform.value.mobileNumber!,
      address: this.employeeform.value.address!,
    }
    this.services.updateItem(employee).subscribe((res) => {
      console.log("success", res)
      // this.employeeform.patchValue(res)
    })
  }

}
