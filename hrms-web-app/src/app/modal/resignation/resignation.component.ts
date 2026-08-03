import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { ResignationService } from '../../services/Resignation/resignation.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-resignation',
  standalone: true,
  imports: [ReactiveFormsModule, MatInputModule, MatDatepickerModule, MatButton],
  providers: [provideNativeDateAdapter()],
  templateUrl: './resignation.component.html',
  styleUrl: './resignation.component.scss'
})
export class ResignationComponent {
  constructor(private _dialogref: MatDialogRef<ResignationComponent>) { }
  services = inject(ResignationService)
  formbulider = inject(FormBuilder)
  toaster = inject(ToastrService)
  

  resignationForm = this.formbulider.group({
    reason: [''], 
    managerName: [''],
    noticePeriod: [''],
    resignation_Date: ['']
  })

  ngOnInit() { }
  submitResignation() {
    console.log("resign value", this.resignationForm.value)
    this.services.createData(this.resignationForm.value).subscribe({
      next: (val: any) => {
        console.log("resign value", this.resignationForm.value)
        this.toaster.success('Resignation Request Sent Successfully', 'success')
        this._dialogref.close(true);
      },
      error: (err) => {
        console.log(err)
      }
    })
  }
}
