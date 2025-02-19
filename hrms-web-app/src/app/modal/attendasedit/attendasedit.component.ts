import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-attendasedit',
  standalone: true,
  imports: [MatFormField,MatInputModule,MatButtonModule,ReactiveFormsModule,MatCheckboxModule,MatDatepickerModule, MatNativeDateModule],
  templateUrl: './attendasedit.component.html',
  styleUrl: './attendasedit.component.scss'
})
export class AttendaseditComponent {
  services = inject(EmployeeeService)
  formbuilder =inject(FormBuilder)
  toaster=inject(ToastrService)

  attendanse = this.formbuilder.group({
    id: 0,
    clockIn:['',[Validators.required]],
    clockOut:['',[Validators.required]],
    totalHours:['',[Validators.required]],
    isActive:['']
  })

  constructor(private _dialogref: MatDialogRef<AttendaseditComponent>, @Inject(MAT_DIALOG_DATA) public data:any){}

  ngOnInit(){
    this.attendanse.patchValue(this.data)
  }
  submitdata(){
    this.services.updateData(this.attendanse.value).subscribe({
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
