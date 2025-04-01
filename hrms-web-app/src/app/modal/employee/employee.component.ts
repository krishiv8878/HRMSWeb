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
    //firstName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')],],
    lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')],],
    emailAddress: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[1-9][0-9]{9}$')]],
    permanentAddress: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,-]+$')]],
    gender: ['', [Validators.required]],
    currentAddress: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,-]+$')]],
    dateOfJoining: ['', [Validators.required]],
    roleIds: [[], [Validators.required]],
    rolenames: [[]],
    managerId: [0],
    ManagerName: [''],
    isActive: ['', [Validators.required, Validators.pattern('true|false')]]
  })

  roles: any[] = []; // Role master list 
  managers: any; // Manager master list 

  ngOnInit() {
    this.Employeeform.patchValue(this.data);
    console.log('update data', this.data)
    if (this.data) {
      this.isEdit = true;
      // this.services.getData(this.data).subscribe((result) => {
      //   console.log("form ", result)
      // })
    }
    this.roleservises.getAllData().subscribe((roles: any) => {
      this.roles = roles.data;
      console.log('Role Masters:', this.roles);
    })
    this.services.getManager().subscribe((managers: any) => {
      this.managers = managers;
      console.log('managers Masters:', this.managers);
    })
  }

  noWhitespaceValidator(control: any) {
    return control.value?.trim() === '' ? { 'whitespace': true } : null;
  }
  
  allowOnlyLetters(event: KeyboardEvent) {
    if (!/^[a-zA-Z ]$/.test(event.key)) event.preventDefault();
  }
  
  preventInvalidNumbers(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (!/^[1-9][0-9]*$/.test(input.value + event.key)) event.preventDefault();
  }

  preventPaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData?.getData('text') || '';
    if (!/^[1-9][0-9]{9}$/.test(clipboardData)) {
      event.preventDefault();
      this.toaster.error("Invalid mobile number format", "Validation Error");
    }
  }
  

  submitdata() {
    if (this.Employeeform.invalid) {
      this.Employeeform.markAllAsTouched(); // Show errors in UI  

      const errorMessages: { [key: string]: string } = {
        firstName: "First Name is Required",
        lastName: "Last Name is Required",
        emailAddress: this.getControl('emailAddress')?.hasError('required')
          ? "Email Address is required"
          : this.getControl('emailAddress')?.hasError('email')
            ? "Enter a valid email address (e.g., user@example.com)"
            : "",

        mobileNumber: this.getControl('mobileNumber')?.hasError('required')
          ? "Mobile Number is required"
          : this.getControl('mobileNumber')?.hasError('pattern')
            ? "Mobile Number must be 10 digits"
            : "",

        gender: "Please select the Gender",
        permanentAddress: "Permanent Address is Required",
        currentAddress: "Current Address is Required",
        dateOfJoining: "Joining Date is Required",
        roleIds: "RoleID is Required",
        isActive: "Please select Active Status"
      };

      // Show error messages in a popup
      for (const field in errorMessages) {
        const control = this.getControl(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return; // Show one error at a time and stop further execution
        }
      }
    }


    // Proceed with API call if form is valid
    if (this.isEdit) {
      this.services.updateData(this.Employeeform.value).subscribe({
        next: () => {
          this.toaster.success('Successfully updated data', 'Success');
          this._dialogref.close(true);
        },
        error: (err) => {
          console.log("Error:", err);
        }
      });
    } else {
      this.services.createData(this.Employeeform.value).subscribe({
        next: () => {
          this.toaster.success('Successfully added data', 'Success');
          this._dialogref.close(true);
        },
        error: (err) => {
          console.log("Error:", err);
        }
      });
    }
  }
  getControl(controleName: string) {
    return this.Employeeform.get(controleName);
  }

}


