import { Component } from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatFormField,MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

}
