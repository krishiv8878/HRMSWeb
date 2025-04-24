import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/authentication/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
// import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  formBuilder = inject(FormBuilder)
  services = inject(AuthService)
  // http = inject(HttpClient)
  router = inject(Router)
  toster = inject(ToastrService)
  constructor() { }

  login = this.formBuilder.group({
    id: 0,
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(16), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
  })
  data!: any;
  logindata() {

    if (this.login.invalid) {
      this.login.markAllAsTouched();

      const { email, password } = this.login.controls;

      // Email validation
      if (email.errors) {
        if (email.errors['required']) {
          this.toster.error("Email Is Required", "Validation Error");
        } else if (email.errors['email']) {
          this.toster.error("Enter a valid email address", "Validation Error");
        }
      }

      // Password validation
      if (password.errors) {
        if (password.errors['required']) {
          this.toster.error("Password Is Required", "Validation Error");
        } else {
          this.toster.error("Enter a valid password", "Validation Error");
        }
      }
      return;
    }

    //return this.http.get<any>
    if (this.login.valid) {
      console.log(this.login.value)
      this.services.createLogin(this.login.value).subscribe({
        next: (res) => {
          console.log("ress", res)

          //  Store ID from res.data
          // localStorage.setItem('userId', res.data);
          //  Store email from form value
          // localStorage.setItem('userEmail', this.login.value.email || '');

          this.toster.success('successfully login', 'success')
          
          setTimeout(() => {
            this.toster.clear();
            this.router.navigateByUrl('index')
            this.login.reset();
          }, 300);
        }, error: (res) => {
          this.toster.error("Invalid credentials", 'error')
        }
      })
    }
  }
}

