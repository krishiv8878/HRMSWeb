import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/authentication/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
// import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
// import { MatCheckbox } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, CommonModule, MatIcon, RouterLink, MatDividerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  constructor() { }

  formBuilder = inject(FormBuilder)
  services = inject(AuthService)
  // http = inject(HttpClient)
  router = inject(Router)
  toster = inject(ToastrService)


  login = this.formBuilder.group({
    id: 0,
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(16), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
  })
  data!: any;
  hide: boolean = true;

  togglePasswordVisibility() {
    this.hide = !this.hide;
  }

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
          localStorage.setItem('employeeId', res.data.userId)
          localStorage.setItem('LoginTokan', res.data.token);
          localStorage.setItem('UserName', res.data.userName);
          localStorage.setItem('RoleType', res.data.roleType);

          this.toster.success('successfully login', 'success')

          setTimeout(() => {
            this.toster.clear();
            this.router.navigateByUrl('index/home')
            this.login.reset();
          }, 1000);
        }, error: (res) => {
          this.toster.error("Invalid credentials", 'error')
        }
      })
    }
  }
}

