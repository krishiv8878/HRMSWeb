import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-resetpassword',
  standalone: true,
  imports: [MatCard, ReactiveFormsModule, CommonModule, MatInputModule, MatIcon, MatButton, RouterLink],
  templateUrl: './resetpassword.component.html',
  styleUrl: './resetpassword.component.scss'
})
export class ResetpasswordComponent {
  formbuilder = inject(FormBuilder);
  services = inject(AuthService);
  toster = inject(ToastrService);

  getClientCallbackUrl(): string {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return `${window.location.origin}/forgot-password`;
    }
    return 'http://localhost:4200/forgot-password';
  }

  passwordResetForm = this.formbuilder.group({
    email: ['', [Validators.required, Validators.email]],
    ClientUrl: [this.getClientCallbackUrl()]
  });

  onSubmit() {
    if (this.passwordResetForm.invalid) {
      this.toster.error('Please enter a valid email address.', 'Validation Error');
      return;
    }

    const payload = {
      email: this.passwordResetForm.value.email || '',
      clientUrl: this.passwordResetForm.value.ClientUrl || this.getClientCallbackUrl()
    };

    this.services.forgotPassword(payload).subscribe({
      next: () => {
        this.toster.success('If an account matches this email, a reset link has been dispatched.', 'Email Sent');
      },
      error: (err) => {
        console.error('Password reset request error:', err);
        this.toster.error('Unable to send password reset link. Please try again later.', 'Request Failed');
      }
    });
  }
}
