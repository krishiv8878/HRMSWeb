import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';
// import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  constructor() { }
  services = inject(AuthService)
  formBuilder = inject(FormBuilder)
  router = inject(Router)
  // http = inject(HttpClient)
  toaster = inject(ToastrService)

  registretion = this.formBuilder.group({
    id: 0,
    FirstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    LastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[0-9]{10}$')]],
    Address: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
  })
  ngOnInit() { }

  submit() {
    if (this.registretion.invalid) {
      this.registretion.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        FirstName: "First Name is Required",
        LastName: "Last Name is Required",
        email: "Enter Valid Email",
        mobileNumber: "Mobile Number Must Be 10 Digits",
        Address: " Address is Required",
        password: "Password is Required",
      };

      for (const field in errorMessages) {
        const control = this.registretion.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.registretion.valid) {
      this.services.createRegister(this.registretion.value).subscribe(() => {
        console.log(this.registretion.value)
        this.registretion.reset()
        this.router.navigateByUrl('login')
      })

    }
  }

  getControl(controleName: string) {
    return this.registretion.get(controleName);
  }

}
