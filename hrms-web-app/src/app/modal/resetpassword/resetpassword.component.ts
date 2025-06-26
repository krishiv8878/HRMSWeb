import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
  constructor() { }
  formbuilder = inject(FormBuilder)
  services = inject(AuthService)
  toster = inject(ToastrService)

  passwordResetForm = this.formbuilder.group({
    email: [''],
    ClientUrl: [`http://localhost:4200/forgot-password`]
  })

  onSubmit() {

    const email = this.passwordResetForm.value.email;
    // ✅ Save email to localStorage
    if (email) {
      localStorage.setItem('resetEmail', email);
    }


    this.services.resetPassword(this.passwordResetForm.value).subscribe({
      next: (res) => {
        this.toster.success('successfully Send Email')

      }, error: (err) => {
        console.log(err)
        this.toster.error("Invalid credentials")
      }
    })
  }
}
