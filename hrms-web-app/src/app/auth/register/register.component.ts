import { Component, inject, OnInit } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, CommonModule, ReactiveFormsModule, MatIconModule, MatDividerModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  services = inject(AuthService);
  formBuilder = inject(FormBuilder);
  router = inject(Router);
  route = inject(ActivatedRoute);
  toaster = inject(ToastrService);

  invitationToken: string | null = null;
  isInvitationValid: boolean = false;
  invitationStatusChecked: boolean = false;
  invitationMessage: string = '';
  hide: boolean = true;

  registretion = this.formBuilder.group({
    id: 0,
    FirstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    LastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[0-9]{10}$')]],
    Address: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-=]+$')]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.invitationToken = params['token'] || null;
      const emailParam = params['email'] || '';

      if (this.invitationToken) {
        if (emailParam) {
          this.registretion.patchValue({ email: emailParam });
        }

        this.services.verifyInvitation(this.invitationToken).subscribe({
          next: (res: any) => {
            const data = res?.data || res;
            this.isInvitationValid = true;
            this.invitationStatusChecked = true;
            this.invitationMessage = 'Invitation verified. Please complete your account details and password.';
            this.toaster.info(this.invitationMessage, 'Invitation Verified');

            if (data?.email) {
              this.registretion.patchValue({
                email: data.email,
                FirstName: data.firstName || this.registretion.get('FirstName')?.value,
                LastName: data.lastName || this.registretion.get('LastName')?.value
              });
            }
          },
          error: (err: any) => {
            this.isInvitationValid = false;
            this.invitationStatusChecked = true;
            this.invitationMessage = err?.error?.message || 'Invalid or expired invitation link. Please contact HR.';
            this.toaster.error(this.invitationMessage, 'Invitation Invalid');
          }
        });
      } else {
        this.isInvitationValid = false;
        this.invitationStatusChecked = true;
        this.invitationMessage = 'Registration is by invitation only. Please use the secure invitation link provided by your HR administrator.';
      }
    });
  }

  togglePasswordVisibility() {
    this.hide = !this.hide;
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
      this.toaster.error('Invalid mobile number format', 'Validation Error');
    }
  }

  submit() {
    if (!this.invitationToken) {
      this.toaster.error('Direct public registration is disabled. Please use the invitation link sent to your email.', 'Invitation Required');
      return;
    }

    if (this.registretion.invalid) {
      this.registretion.markAllAsTouched();
      const errorMessages: { [key: string]: string } = {
        FirstName: 'First Name Is Required',
        LastName: 'Last Name Is Required',
        email: 'Enter Valid Email',
        mobileNumber: 'Mobile Number Must Be 10 Digits',
        Address: 'Address Is Required',
        password: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      };

      for (const field in errorMessages) {
        const control = this.registretion.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], 'Validation Error');
          return;
        }
      }
      return;
    }

    const payload = {
      token: this.invitationToken,
      password: this.registretion.value.password,
      firstName: this.registretion.value.FirstName,
      lastName: this.registretion.value.LastName,
      mobileNumber: this.registretion.value.mobileNumber,
      address: this.registretion.value.Address
    };

    this.services.acceptInvitation(payload).subscribe({
      next: () => {
        this.toaster.success('Account registration completed! You may now log in.', 'Success');
        this.registretion.reset();
        this.router.navigateByUrl('login');
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Registration failed. The invitation may be expired or already used.';
        this.toaster.error(msg, 'Registration Error');
      }
    });
  }
}
