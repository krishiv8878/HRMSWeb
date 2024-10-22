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

  project=this.formbuilder.group({
    id: 0,
    createdBy:['',[Validators.required]],
    createdDate:['',[Validators.required]],
    updatedBy:['',[Validators.required]],
    updatedDate:['',[Validators.required]],     
    projectName: ['',[Validators.required]],
    description: ['',[Validators.required]],
    clientName: ['',[Validators.required]],
    clientRegion:['',[Validators.required]],
    isActive: ['']
 })

 ngOnInit() {
  this.project.patchValue(this.data);
  if (this.data) {
    this.isEdit = true
  }
}

submitdata() {
  if (this.isEdit) {
    this.services.updateData(this.project.value).subscribe({
      next: (val: any) => {
        // console.log('update successfully')
        alert("data updated successfully")
        this._dialogref.close(true);
      }, error: (err) => {
        console.log("err msg", err)
      }
    })
  } else {
    this.services.createData(this.project.value).subscribe({
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
