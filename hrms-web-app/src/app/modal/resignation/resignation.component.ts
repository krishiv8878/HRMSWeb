import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { ResignationService } from '../../services/Resignation/resignation.service';

@Component({
  selector: 'app-resignation',
  standalone: true,
  imports: [ReactiveFormsModule, MatInputModule, MatDatepickerModule, MatButton],
  providers: [provideNativeDateAdapter()],
  templateUrl: './resignation.component.html',
  styleUrl: './resignation.component.scss'
})
export class ResignationComponent {
  constructor() { }
  services = inject(ResignationService)
  formbulider = inject(FormBuilder)

  resignationForm = this.formbulider.group({
    reason: [''], 
    managerName: [''],
    noticePeriod: [''],
    resignation_Date: ['']
  })

  ngOnInit() { }
  submitResignation() {
    console.log("resign value", this.resignationForm.value)
    this.services.createData(this.resignationForm.value).then(
      (val: any) => {
        console.log("resign value", this.resignationForm.value)
      }).catch(err => {
        console.log(err)
      })
  }
}
