import { Component, Inject, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { EmployeeService } from '../../services/employee/employee.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose, MatSelectModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss'
})
export class EmployeeComponent {

  constructor(
    private _dialogref: MatDialogRef<EmployeeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  formBuilder = inject(FormBuilder)
  services = inject(EmployeeService)
  route = inject(ActivatedRoute)
  router = inject(Router)
  toaster = inject(ToastrService)
  roleservises = inject(RoleservicesService)
  isEdit = false;

  Employeeform = this.formBuilder.group({
    id: 0,
    firstName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    lastName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    emailAddress: ['', [Validators.required,Validators.email]],
    mobileNumber: ['', [Validators.required,Validators.pattern('^[0-9]+$'), Validators.maxLength(10)]],
    permanentAddress: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    gender: '',
    currentAddress: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    dateOfJoining: ['',[Validators.required]],
    roleIds: [[], [Validators.required, Validators.pattern('^[0-9]+$')]],
    isActive: ['']
  })

  roles: any[] = []; // Role master list 
  
  ngOnInit() {
    this.Employeeform.patchValue(this.data);
    console.log('update data', this.data)
    if (this.data) {
      this.isEdit = true;
      // this.services.getData(this.data).subscribe((result) => {
      //   console.log("form ", result)
      // })
    }
    this.roleservises.getAllData().subscribe((roles:any)=>{
      this.roles = roles.data;
      console.log('Role Masters:', this.roles);
    })
  }
 

  submitdata() {
    if (this.Employeeform.invalid) {
      this.Employeeform.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        firstName: "First Name is Required",
        lastName: "Last Name is Required",
        emailAddress: "Enter Valid Email",
        mobileNumber: "Mobile Number Must Be 10 Digits",
        permanentAddress: "Permanent Address is Required",
        currentAddress: "Current Address is Required",
        // dateOfJoining: "Date is Required",
        roleIds: "RoleID is Required",       
      };

      for (const field in errorMessages) {
        const control = this.Employeeform.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.Employeeform.value).subscribe({                                                                                                                                             
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {     
      this.services.createData(this.Employeeform.value).subscribe({
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
  getControl(controleName:string){
    return this.Employeeform.get(controleName);
  }
}
