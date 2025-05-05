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
    totalExperience: ['', [Validators.required, Validators.pattern('^[0-9.,]+$')]],
    relevantExperience: ['', [Validators.required, Validators.pattern('^[0-9.,]+$')]],
    expectedSalary: ['', [Validators.required, Validators.pattern('^[0-9.,]+$')]],
    currentSalary: ['', [Validators.required, Validators.pattern('^[0-9.,]+$')]],
    noticePeriod: ['', [Validators.required, Validators.pattern('^[0-9.,]+$')]],
    isActive: [true, [Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.CandidateForm.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;
    }
  }


  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    // Allow letters and space only
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    // Allow numbers and space only
    if (!/^[0-9 .,]$/.test(key)) {
      event.preventDefault();
    }
  }



  submitdata() {
    if (this.CandidateForm.invalid) {
      this.CandidateForm.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        firstName: "First Name Is Required",
        lastName: "Last Name Is Required",
        // emailAddress: "Enter Valid Email",
        // mobileNumber: "Mobile Number Must Be 10 Digits",
        emailAddress: this.getControl('emailAddress')?.hasError('required')
          ? "Email Address Is Required"
          : this.getControl('emailAddress')?.hasError('email')
            ? "Enter a valid email address (e.g., user@example.com)"
            : "",

        mobileNumber: this.getControl('mobileNumber')?.hasError('required')
          ? "Mobile Number Is Required"
          : this.getControl('mobileNumber')?.hasError('pattern')
            ? "Mobile Number must be 10 digits"
            : "Invalid Mobile Number",

        totalExperience: "Total Experience Is Required",
        relevantExperience: "Relevant Experience Is Required",
        expectedSalary: "Expected Salary Is Required",
        currentSalary: "Current Salary Is Required",
        noticePeriod: "Notice Period Is Required",
       //isActive: " Please select a Active Button"

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
          this.toaster.success('Candidate Recode Successfully Updated', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.CandidateForm.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success(' Candidate Recode Successfully Added', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }

  getControl(controleName: string) {
    return this.CandidateForm.get(controleName);
  }
}

