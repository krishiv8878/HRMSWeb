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
import { MatSelectModule } from '@angular/material/select';


@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose, MatSelectModule],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateeComponent {
  fomBuilder = inject(FormBuilder)
  services = inject(CandidateService)
  route = inject(ActivatedRoute)
  isEdit = false;
  toaster = inject(ToastrService)

  numbers: number[] = Array.from({ length: 90 }, (_, i) => i + 1)
  numbermenu: number | null = null;

  constructor(private _dialogref: MatDialogRef<CandidateeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  CandidateForm = this.fomBuilder.group({
    id: 0,
    firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    emailAddress: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[0-9]{10}$')]],
    totalExperience: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    relevantExperience: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    expectedSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    currentSalary: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    noticePeriod: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    isActive: ['',[Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.CandidateForm.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;
    }
  }
  submitdata() {
    if (this.CandidateForm.invalid) {
      this.CandidateForm.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        firstName: "First Name is Required",
        lastName: "Last Name is Required",
        emailAddress: "Enter Valid Email",
        mobileNumber: "Mobile Number Must Be 10 Digits",
        totalExperience: "Total Experience is Required",
        relevantExperience: "Relevant Experience is Required",
        expectedSalary: "Expected Salary is Required",
        currentSalary: "Current Salary is Required",
        noticePeriod: "Notice Period is Required",
        isActive:" Please select a Active Button"
      };

      for (const field in errorMessages) {
        const control = this.CandidateForm.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
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

  // getControl(controleName: string) {
  //   return this.CandidateForm.get(controleName);
  // }  
}
