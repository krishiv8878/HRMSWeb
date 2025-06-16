import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [ReactiveFormsModule, MatCard, MatInputModule, MatButton,MatDatepickerModule],
    providers: [provideNativeDateAdapter()],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss'
})
export class ExperienceComponent {
  constructor() { }

  formbuilder = inject(FormBuilder)
  experienceForm = this.formbuilder.group({

  })
  submitExperience() { }
}
