import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeService } from '../../../services/employee/employee.service';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [MatInputModule, CommonModule, MatDatepickerModule, MatSelectModule, MatButton, ReactiveFormsModule, MatCard],
  templateUrl: './emergency.component.html',
  styleUrl: './emergency.component.scss'
})
export class EmergencyComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  services = inject(EmployeeService)
  router = inject(Router)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)

  contact = this.formbuilder.group({
    //* primary contact
    primaryEmailAddress: [''],
    primaryContactName: [''],
    primaryContactRelationship: [''],
    primaryContactPhone: [''],
    primaryContactEmail: [''],
    primaryContactAddress: [''],

    //* secondary contact
    secondaryContactName: [''],
    secondaryContactRelationship: [''],
    secondaryContactPhone: [''],
    secondaryContactEmail: [''],
    secondaryContactAddress: [''],
  })

  ngOnInit() {
    this.contact.patchValue(this.data)
  }
  submitcontact() {
    console.log("contact value", this.contact.value)
    this.services.updateData(this.contact.value).then(
      () => {
        console.log("contact value", this.contact.value)
        this.toaster.success('Recode Successfully Added')
      }).catch(err => {
        console.log("invalid data", err)
      })
  }
}
