import { CommonModule } from '@angular/common';
import { Component, inject, Inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  templateUrl: './holidays.component.html',
  styleUrl: './holidays.component.scss',
  providers: [provideNativeDateAdapter()],
})
export class HolidaysComponent {
  constructor(
    private _dialogref: MatDialogRef<HolidaysComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  formBuilder = inject(FormBuilder)
  services = inject(HolidayservicesService)
  route = inject(ActivatedRoute)
  router = inject(Router)
  toaster = inject(ToastrService)
  holidayId!: number;
  isEdit = false;

  Holidayform = this.formBuilder.group({
    id: 0,
    holidayName: ['', [Validators.required]],
    description: [''],
    updatedBy: [''],
    updatedDate: [''],
    createdBy: [''],
    createdDate: [''],
    isActive: ['']
  })

  ngOnInit() {
    this.Holidayform.patchValue(this.data);
    console.log('update data', this.data)
    if (this.data) {
      this.isEdit = true;
      // this.services.getSkill(this.data).subscribe((result) => {
      //   console.log("form ", result)
      // })
    }
  }


  submitdata() {
    if (this.isEdit) {
      this.services.updateHoliday(this.Holidayform.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createHoliday(this.Holidayform.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success('successfully add data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
}
