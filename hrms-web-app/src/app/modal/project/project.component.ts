import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectsService } from '../../services/project/projects.service';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';
import { getNames } from 'country-list';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatSelectModule, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
  providers: [provideNativeDateAdapter()],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss'
})
export class ProjectComponent {
  constructor(private _dialogref: MatDialogRef<ProjectComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  formbuilder = inject(FormBuilder)
  services = inject(ProjectsService)
  isEdit = false;
  toaster = inject(ToastrService)

  countries: string[] = [];


  project = this.formbuilder.group({
    id: 0,
    projectName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    description: ['', [Validators.required,]],
    clientName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    clientRegion: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 ]+$')]],
    isActive: [true, [Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.countries = getNames();
    // this.project.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      console.log('Payment ID:', this.id);
      this.project.patchValue(this.data);
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
    if (!/^[0-9 ]$/.test(key)) {
      event.preventDefault();
    }
  }
  
  id!: any;

  submitdata() {
    if (this.project.invalid) {
      this.project.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        projectName: "Project Name is Required",
        description: "Description is Required",
        clientName: "Client Name is Required",
        clientRegion: "ClientRegion Name is Required",
        isActive: " Please select a Active Button"
      };

      for (const field in errorMessages) {
        const control = this.project.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.project.value, this.id).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.project.value).subscribe({
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
  getControl(controleName: string) {
    return this.project.get(controleName);
  }
}
