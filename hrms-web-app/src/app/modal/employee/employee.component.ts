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

  noWhitespaceValidator(control: any) {
    if (control.value && control.value.trim() === '') {
      return { 'whitespace': true };
    }
    return null;
  }
  
  
  Employeeform = this.formBuilder.group({
    id: 0,
    //firstName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    firstName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$'),this.noWhitespaceValidator],],
    lastName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$'),this.noWhitespaceValidator],],
    emailAddress: ['', [Validators.required,Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$'),this.noWhitespaceValidator]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[1-9][0-9]{9}$')]],
    permanentAddress: ['', [Validators.required,Validators.pattern('^[a-zA-Z0-9 .,-]+$'),this.noWhitespaceValidator]],
    gender: ['',[Validators.required]],
    currentAddress: ['', [Validators.required,Validators.pattern('^[a-zA-Z0-9 .,-]+$'),this.noWhitespaceValidator]],
    dateOfJoining: ['',[Validators.required]],
    roleIds: [[], [Validators.required]],
    managerId:[0],
    ManagerName :[''],
    isActive: ['',[Validators.required, Validators.pattern('true|false')]]
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
 
  allowOnlyLetters(event: KeyboardEvent) {
    const charCode = event.key.charCodeAt(0);
    if (!/[a-zA-Z ]/.test(event.key)) {
      event.preventDefault(); // Stop the key from being entered
    }
  }
 
  preventInvalidNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    const input = event.target as HTMLInputElement;
  
    // Allow only numbers (0-9), prevent spaces and non-numeric characters
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  
    // Prevent starting with 0
    if (input.value.length === 0 && charCode === 48) {
      event.preventDefault();
    }
  }
  
  preventPaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData?.getData('text');
    if (clipboardData && !/^[1-9][0-9]{9}$/.test(clipboardData)) {
      event.preventDefault();
      this.toaster.error("Invalid mobile number format", "Validation Error");
    }
  }
  
  
  submitdata() {
    if (this.Employeeform.invalid) {
      this.Employeeform.markAllAsTouched(); // Show errors
  
      const errorMessages: { [key: string]: string } = {
        firstName: this.getControl('firstName')?.hasError('whitespace')
          ? "First Name cannot be empty or only spaces"
          : "Only letters are allowed in First Name",
  
        lastName: this.getControl('lastName')?.hasError('whitespace')
          ? "Last Name cannot be empty or only spaces"
          : "Only letters are allowed in Last Name",
  
        emailAddress: this.getControl('emailAddress')?.hasError('required')
          ? "Email Address is required"
          : this.getControl('emailAddress')?.hasError('email')
            ? "Enter a valid email address (e.g., user@example.com)"
            : "Email format is incorrect",
  
        mobileNumber: this.getControl('mobileNumber')?.hasError('required')
          ? "Mobile Number is required"
          : this.getControl('mobileNumber')?.hasError('pattern')
            ? "Mobile Number must be 10 digits and cannot start with 0"
            : "Invalid Mobile Number",
  
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
  getControl(controleName:string){
    return this.Employeeform.get(controleName);
  }
}
