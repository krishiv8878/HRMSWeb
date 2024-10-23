import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { LeavetypeService } from '../../services/leave/leavetype.service';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent {
  constructor(private _dialogref: MatDialogRef<LeaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  services = inject(LeavetypeService)
  formbuilder = inject(FormBuilder)
  isEdit = false;

  leavetype = this.formbuilder.group({
    id: 0,
    leaveName: ['', [Validators.required]],
    leaveType: ['', [Validators.required]],
    createdBy: ['', [Validators.required]],
    createdDate: ['', [Validators.required]],
    updatedBy: ['', [Validators.required]],
    updatedDate: ['', [Validators.required]],
    description: ['', [Validators.required]],
    isActive: ['']
  })

  ngOnInit() {
    this.leavetype.patchValue(this.data);
    if (this.data) {
      this.isEdit = true
    }
  }

  submitdata() {
    if (this.isEdit) {
      this.services.updateData(this.leavetype.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          alert("data updated successfully")
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.leavetype.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          alert('data add successfully')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
}
