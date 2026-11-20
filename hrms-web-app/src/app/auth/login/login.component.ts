import { Component, inject, OnInit } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/authentication/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../services/employee/employee.service';
import { AttendanceStateService } from '../../services/attendance/attendance-state.service';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, CommonModule, MatIcon, RouterLink, MatDividerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  formBuilder = inject(FormBuilder);
  services = inject(AuthService);
  employeeService = inject(EmployeeService);
  attendanceStateService = inject(AttendanceStateService);
  router = inject(Router);
  toster = inject(ToastrService);

  ngOnInit(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('LoginToken') || localStorage.getItem('LoginTokan');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload && payload.exp && Date.now() < payload.exp * 1000) {
              this.router.navigateByUrl('/index/dashboard');
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
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(64)]]
  });

  hide: boolean = true;

  togglePasswordVisibility() {
    this.hide = !this.hide;
  }

  logindata() {
    if (this.login.invalid) {
      this.login.markAllAsTouched();
      const { email, password } = this.login.controls;

      if (email.errors) {
        if (email.errors['required']) {
          this.toster.error("Email Is Required", "Validation Error");
        } else if (email.errors['email']) {
          this.toster.error("Enter a valid email address", "Validation Error");
        }
      }

      if (password.errors) {
        if (password.errors['required']) {
          this.toster.error("Password Is Required", "Validation Error");
        } else {
          this.toster.error("Enter a valid password", "Validation Error");
        }
      }
      return;
    }

    if (this.login.valid) {
      this.services.createLogin(this.login.value).subscribe({
        next: (res) => {
          // Clear any leftover session data from previously logged-in user
          localStorage.clear();

          localStorage.setItem('employeeId', res.data.userId);
          localStorage.setItem('LoginToken', res.data.token);
          localStorage.setItem('LoginTokan', res.data.token); // Backward compatibility
          localStorage.setItem('UserName', res.data.userName);
          localStorage.setItem('userName', res.data.userName);
          localStorage.setItem('fullName', res.data.userName);
          localStorage.setItem('RoleType', res.data.roleType);
          localStorage.setItem('role', res.data.roleType);
          localStorage.setItem('Role', res.data.roleType);
          if (res.data.email) {
            localStorage.setItem('userEmail', res.data.email);
          }

          this.employeeService.setProfileInfo('', '', res.data.userName, res.data.email);
          this.employeeService.clearAvatar();

          // Reset attendance clock state for the new user session
          this.attendanceStateService.reinit();

          this.toster.success('Successfully logged in', 'Success');

          setTimeout(() => {
            this.toster.clear();
            if (res.data.isResetPasswordRequired === true) {
              this.router.navigateByUrl('reset-password');
              this.login.reset();
              return;
            } else {
              this.router.navigateByUrl('index/dashboard');
              this.login.reset();
            }
          }, 1000);
        },
        error: (err) => {
          if (err?.status === 403) {
            const msg = err?.error?.message || 'No active role assigned to this account. Please contact system support at support@khrms.com.';
            this.toster.error(msg, 'Access Denied', { timeOut: 8000 });
          } else if (err?.status === 429) {
            const msg = err?.error?.message || 'Account temporarily locked due to failed attempts. Please try again later or reset password.';
            this.toster.error(msg, 'Account Locked', { timeOut: 6000 });
          } else {
            const msg = err?.error?.message || 'Invalid email or password.';
            this.toster.error(msg, 'Login Failed');
          }
        }
      });
    }
  }
}
