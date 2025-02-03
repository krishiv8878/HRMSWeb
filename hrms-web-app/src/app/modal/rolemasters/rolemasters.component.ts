import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';

@Component({
  selector: 'app-rolemasters',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose, MatSelectModule],
  templateUrl: './rolemasters.component.html',
  styleUrl: './rolemasters.component.scss'
})
export class RolemastersComponent {
  constructor(private _dialogref: MatDialogRef<RolemastersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  fomBuilder = inject(FormBuilder)
  services = inject(RoleservicesService)
  route = inject(ActivatedRoute)
  isEdit = false;
  toaster = inject(ToastrService)

  roledateForm = this.fomBuilder.group({
    id: 0,
    roleName: ['', [Validators.required]],
    isActive: ['']
  })

  ngOnInit() {
    this.roledateForm.patchValue(this.data);
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
      this.services.updateData(this.roledateForm.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.roledateForm.value).subscribe({
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
