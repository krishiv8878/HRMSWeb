import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/authentication/auth.service';
import { Router } from '@angular/router';
// import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  formBuilder = inject(FormBuilder)
  services = inject(AuthService)
  // http = inject(HttpClient)
  router = inject(Router)
  constructor() { }

  login = this.formBuilder.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  })

  logindata() {
    //return this.http.get<any>
    if (this.login.valid) {
      console.log(this.login.value)
      this.services.createLogin(this.login.value).subscribe(() => {
        alert('successfully login')
        this.login.reset();
        this.router.navigateByUrl('index')
      })
    } else {
      alert('invalid email and password ')
    }
  }
}

