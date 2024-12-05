import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { CandidateService } from '../../services/candidate/candidate.service';
import { ActivatedRoute } from '@angular/router';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateeComponent {
  fomBuilder = inject(FormBuilder)
  services = inject(CandidateService)
  route = inject(ActivatedRoute)
  isEdit = false;
  toaster = inject(ToastrService)

  constructor(private _dialogref: MatDialogRef<CandidateeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  CandidateForm = this.fomBuilder.group({
    id: 0,
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    emailAddress: ['', [Validators.required]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10)]],
    totalExperience: ['', [Validators.required]],
    relevantExperience: ['', [Validators.required]],
    expectedSalary: ['', [Validators.required]],
    currentSalary: ['', [Validators.required]],
    noticePeriod: ['', [Validators.required]],
    isActive: ['']
  })

  ngOnInit() {
    this.CandidateForm.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;
    }
  }
  submitdata() {
    if (this.isEdit) {
      this.services.updateData(this.CandidateForm.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.CandidateForm.value).subscribe({
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
