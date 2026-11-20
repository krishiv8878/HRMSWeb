import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-forgotpassword',
  standalone: true,
  imports: [MatCard, ReactiveFormsModule, CommonModule, MatInputModule, MatIcon, MatButtonModule],
  templateUrl: './forgotpassword.component.html',
  styleUrl: './forgotpassword.component.scss'
})
export class ForgotpasswordComponent implements OnInit {
  services = inject(AuthService);
  formbuilder = inject(FormBuilder);
  toster = inject(ToastrService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  hide: boolean = true;

  togglePasswordVisibility() {
    this.hide = !this.hide;
  }
  
  forgotPasswordForm = this.formbuilder.group({
    token: ['', [Validators.required]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(64),
      Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,64}$')
    ]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['Token'] || params['token'];
      if (token) {
        this.forgotPasswordForm.patchValue({ token });
      } else {
        this.toster.warning('No reset token found in link. Please request a new link if needed.', 'Missing Token');
      }
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      const passControl = this.forgotPasswordForm.get('password');
      if (passControl?.errors) {
        if (passControl.errors['required']) {
          this.toster.error('New password is required.', 'Validation Error');
        } else {
          this.toster.error('Password must be 8-64 characters and contain uppercase, lowercase, number, and special character (@$!%*?&).', 'Validation Error');
        }
      }
      return;
    }

    const payload = {
      token: this.forgotPasswordForm.value.token || '',
      password: this.forgotPasswordForm.value.password || ''
    };

    this.services.resetPassword(payload).subscribe({ 
      next: () => {
        this.toster.success('Password has been reset successfully. You may now log in.', 'Success');
        this.router.navigateByUrl('login');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to reset password. The link may have expired or already been used.';
        this.toster.error(msg, 'Reset Error');
      }
    });
  }
}
