import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
    id:0,

  })

  submitdata(){}
}
