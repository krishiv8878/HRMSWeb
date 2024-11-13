import { Component, inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authentication/auth.service';
// import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  constructor() { }
  services = inject(AuthService)
  formBuilder = inject(FormBuilder)
  router = inject(Router)
  // http = inject(HttpClient)
  registretion = this.formBuilder.group({
    id: 0,
    FirstName: ['', [Validators.required]],
    LastName: ['', [Validators.required]],
    email: ['', [Validators.required]],
    MobileNumber: ['', [Validators.required, Validators.maxLength(10)]],
    Address: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  })
  ngOnInit() { }

  submit() {
    if (this.registretion.valid) {
      this.services.createRegister(this.registretion.value).subscribe(() => {
        console.log(this.registretion.value)
        this.registretion.reset()
        this.router.navigateByUrl('login')
      })

    }
  }
}
