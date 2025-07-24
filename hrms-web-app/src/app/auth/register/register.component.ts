import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
// import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, CommonModule, ReactiveFormsModule, MatIconModule, MatDividerModule],
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
  // In your component.ts file
  // hide = true;

  registretion = this.formBuilder.group({
    id: 0,
    FirstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    LastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[0-9]{10}$')]],
    Address: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-=]+$')]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(16), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
  })
  ngOnInit() { }
  hide: boolean = true;

  togglePasswordVisibility() {
    this.hide = !this.hide;
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

  submit() {
    if (this.registretion.invalid) {
      this.registretion.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        FirstName: "First Name Is Required",
        LastName: "Last Name Is Required",
        email: "Enter Valid Email",
        mobileNumber: "Mobile Number Must Be 10 Digits",
        Address: " Address Is Required",
        password: "Password Is Required",
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
      this.services.createRegister(this.registretion.value).then(() => {
        console.log(this.registretion.value)
        this.registretion.reset()
        this.router.navigateByUrl('login')
      })
    }
  }
}
