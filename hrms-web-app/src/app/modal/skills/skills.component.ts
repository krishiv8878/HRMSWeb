import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';
import { SkillservicesService } from '../../services/skill/skillservices.service';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [MatInputModule, MatFormFieldModule, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss'
})
export class SkillsComponent {
  constructor(
    private _dialogref: MatDialogRef<SkillsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  formBuilder = inject(FormBuilder)
  services = inject(SkillservicesService)
  route = inject(ActivatedRoute)
  router = inject(Router)
  toaster = inject(ToastrService)
  employeeId!: number;
  isEdit = false;

  Skillform = this.formBuilder.group({
    id: 0,
    skillName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\-,#,+]+$')]],
    isActive: [true, [Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.Skillform.patchValue(this.data);
    console.log('update data', this.data)
    if (this.data) {
      this.isEdit = true;
      // this.services.getSkill(this.data).subscribe((result) => {
      //   console.log("form ", result)
      // })
    }
  }


  submitdata() {
    if (this.Skillform.invalid) {
      this.Skillform.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        skillName: "Skill Name Is Required",
       //isActive: " Please select a Active Button"
      };

      // Show error messages in a popup
      for (const field in errorMessages) {
        const control = this.getControl(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return; // Show one error at a time and stop further execution
        }
      }
    }
    if (this.isEdit) {
      this.services.updateSkill(this.Skillform.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('Recode Successfully Updated', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createSkill(this.Skillform.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success(' Recode Successfully Added', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
  getControl(controleName: string) {
    return this.Skillform.get(controleName);
  }
}