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

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [MatInputModule, MatFormField, MatButtonModule, ReactiveFormsModule, MatRadioModule, CommonModule, FormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatDialogClose],
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

  project = this.formbuilder.group({
    id: 0,
    projectName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    description: [''],
    clientName: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    clientRegion: ['', [Validators.required,Validators.pattern('^[a-zA-Z ]+$')]],
    isActive: ['',[Validators.required, Validators.pattern('true|false')]]
  })

  ngOnInit() {
    this.project.patchValue(this.data);
    if (this.data) {
      this.isEdit = true
    }
  }
  allowOnlyLetters(event: KeyboardEvent) {
    const charCode = event.key.charCodeAt(0);
    if (!/[a-zA-Z ]/.test(event.key)) {
      event.preventDefault(); // Stop the key from being entered
    }
  }
  submitdata() {
    if (this.project.invalid) {
      this.project.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        projectName: "Project Name is Required",
        description: "Description is Required",
        clientName: "Client Name is Required",
        clientRegion: "ClientRegion Name is Required",   
        isActive:" Please select a Active Button"    
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
      this.services.updateData(this.project.value).subscribe({
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
  getControl(controleName:string){
    return this.project.get(controleName);
  }
}
