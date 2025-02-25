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
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule,CommonModule],
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
    email: ['', [Validators.required, Validators.pattern(/^[^@]+@[^@]+\.[^@]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]]
  })

  logindata() {
    //return this.http.get<any>
    if (this.login.valid) {
      console.log(this.login.value)
      this.services.createLogin(this.login.value).subscribe(() => {
        // alert('successfully login')
        this.login.reset();
        this.router.navigateByUrl('index')
        this.toster.success('successfully login','success')
      })
    } else {
      this.toster.error('invalide email and password', 'error')
    }
  }

  getControl(controleName:string){
    return this.login.get(controleName);
  }
  // Custom validator for strong password
  passwordValidator(control: any) {
    const value = control.value || '';
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);
    const isValid = hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
    return isValid ? null : { strongPassword: true };
  }
}

