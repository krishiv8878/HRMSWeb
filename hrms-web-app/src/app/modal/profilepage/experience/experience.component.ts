import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [ReactiveFormsModule, MatCard, MatInputModule, MatButton, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss'
})
export class ExperienceComponent {
  constructor() { }
  services = inject(EmployeeService)
  router = inject(Router)

  formbuilder = inject(FormBuilder)
  experienceForm = this.formbuilder.group({
    companyName: [''],
    designation: [''],

  })
  submitExperience() {
    this.services.updateData(this.experienceForm.value).subscribe({
      next: () => {
        console.log(this.experienceForm.value)
      }, error: (err) => {
        console.log("error", err)
      }
    })
  }
}
