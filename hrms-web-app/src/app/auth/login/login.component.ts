import { Component, inject, OnInit } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/authentication/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../services/employee/employee.service';
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
export class LoginComponent implements OnInit {
  constructor() { }

  formBuilder = inject(FormBuilder)
  services = inject(AuthService)
  employeeService = inject(EmployeeService)
  // http = inject(HttpClient)
  router = inject(Router)
  toster = inject(ToastrService)

  ngOnInit(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('LoginTokan');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload && payload.exp && Date.now() < payload.exp * 1000) {
              const roleType = localStorage.getItem('RoleType') || '';
              const targetRoute = (roleType.includes('Admin') || roleType.includes('HR') || roleType.includes('Manager'))
                ? '/index/home'
                : '/index/attendance';
              this.router.navigateByUrl(targetRoute);
              return;
            }
          }
        } catch {
          // invalid token format
        }
      }
    }
  }


  login = this.formBuilder.group({
    id: 0,
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(16)]]
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
          // Clear any leftover session data from previously logged-in user
          localStorage.clear();

          localStorage.setItem('employeeId', res.data.userId);
          localStorage.setItem('LoginTokan', res.data.token);
          localStorage.setItem('UserName', res.data.userName);
          localStorage.setItem('userName', res.data.userName);
          localStorage.setItem('fullName', res.data.userName);
          localStorage.setItem('RoleType', res.data.roleType);
          if (res.data.email) {
            localStorage.setItem('userEmail', res.data.email);
          }

          this.employeeService.setProfileInfo('', '', res.data.userName, res.data.email);
          this.employeeService.clearAvatar();

          this.toster.success('Successfully login', 'Success')

          setTimeout(() => {
            this.toster.clear();
            const val = localStorage.getItem('PasswordResetStatus');
            console.log("val",val)
            if(res.data.isResetPasswordRequired==true){
              this.router.navigateByUrl('reset-password');
              this.login.reset();
              return
            }else{
              this.router.navigateByUrl('index/attendance');
              this.login.reset();
            }
          }, 1000);
        }, error: (res) => {
          this.toster.error("Invalid credentials", 'error')
        }
      })
    }
  }
}

