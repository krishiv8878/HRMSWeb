import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCard, MatCardModule } from '@angular/material/card';
import { EmployeeService } from '../../services/employee/employee.service';
import { Router } from '@angular/router';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { InformationComponent } from '../profilepage/information/information.component';
import { EmergencyComponent } from '../profilepage/emergency/emergency.component';
import { EducationDetailsComponent } from '../profilepage/education-details/education-details.component';
import { ExperienceComponent } from '../profilepage/experience/experience.component';
import { BankinfoComponent } from '../profilepage/bankinfo/bankinfo.component';
import { PassportinfoComponent } from '../profilepage/passportinfo/passportinfo.component';

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardModule, MatIcon],
  templateUrl: './userprofile.component.html',
  styleUrl: './userprofile.component.scss'
})
export class UserprofileComponent {
  constructor() { }
  services = inject(EmployeeService)
  router = inject(Router)
  paymentservices = inject(PaymentinfoService)
  employedata: any;
  paymentdata: any;
  dialgo = inject(MatDialog)

  ngOnInit() {
    const userId = localStorage.getItem('employeeId');

    if (userId) {
      this.services.getData().subscribe((response: any) => {
        const allEmployees = response.data;
        this.employedata = allEmployees.find((emp: any) => emp.id == userId);
      });

      this.paymentservices.getAllData().subscribe((response: any) => {
        const allpayment = response.data;
        console.log("All payments:", allpayment);
        this.paymentdata = allpayment.find((pay: any) => pay.employeeId == userId);
        console.log("Found paymentdata:", this.paymentdata);
      })
    } else {
      this.router.navigate(['/login']); // fallback
    }
  }

  info(data: any) {
    const dialogRef = this.dialgo.open(InformationComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
  contact(data: any) {
    const dialogRef = this.dialgo.open(EmergencyComponent, {

    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
  education() {
    const dialogRef = this.dialgo.open(EducationDetailsComponent, {

    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
  experience() {
    const dialogRef = this.dialgo.open(ExperienceComponent, {

    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
  bankinfo(data: any) {
    const dialogRef = this.dialgo.open(BankinfoComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
  passportinfo() {
    const dialogRef = this.dialgo.open(PassportinfoComponent, {

    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.services.getData();
      }
    })
  }
}

