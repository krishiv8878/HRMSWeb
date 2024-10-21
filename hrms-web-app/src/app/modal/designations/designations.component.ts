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
import { DesignationservicesService } from '../../services/designation/designationservices.service';

@Component({
  selector: 'app-designations',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './designations.component.html',
  styleUrl: './designations.component.scss'
})
export class DesignationsComponent {
  constructor(private _dialogref: MatDialogRef<DesignationsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  formbuilder = inject(FormBuilder)
  services = inject(DesignationservicesService)
  isEdit = false;
  designation = this.formbuilder.group({
    id: 0,
    designationName: ['', [Validators.required]],
    updatedBy: [''],
    updatedDate: [''],
    createdBy: [''],
    createdDate: [''],
    isActive: ['']
  })

  ngOnInit() {
    this.designation.patchValue(this.data);
    if (this.data) {
      this.isEdit = true
    }
  }

  submitdata() {
    if (this.isEdit) {
      this.services.updateData(this.designation.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          alert("data updated successfully")
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.designation.value).subscribe({
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
