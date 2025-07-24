import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/authentication/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
// import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgotpassword',
  standalone: true,
  imports: [MatCard, ReactiveFormsModule, CommonModule, MatInputModule, MatIcon, MatButtonModule],
  templateUrl: './forgotpassword.component.html',
  styleUrl: './forgotpassword.component.scss'
})
export class ForgotpasswordComponent {
  constructor() { }
  services = inject(AuthService)
  formbuilder = inject(FormBuilder)
  toster = inject(ToastrService)
  router = inject(Router)
  route = inject(ActivatedRoute);
  hide: boolean = true;
  emailreset!: string;

  togglePasswordVisibility() {
    this.hide = !this.hide;
  }
  
  forgotPasswordForm = this.formbuilder.group({
    token: [''],
    password: ['']
  }) 

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['Token'];
      if (token) {
        this.forgotPasswordForm.patchValue({ token });
        this.onSubmit(); //  Optional: remove if you want manual click
      }
    });
  }

  onSubmit() {
    this.services.forgotpassword(this.forgotPasswordForm.value).then( 
      (val: any) => {
        this.toster.success('SuccesFully Password Forgot')
        this.router.navigateByUrl('login')
      }).catch(err => {
        console.log(err)
      })
  }
}
