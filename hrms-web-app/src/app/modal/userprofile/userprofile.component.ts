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
// import { BankinfoComponent } from '../profilepage/bankinfo/bankinfo.component';
import { PassportinfoComponent } from '../profilepage/passportinfo/passportinfo.component';
import { PaymeenInfoComponent } from '../paymeen-info/paymeen-info.component';
import { SkillservicesService } from '../../services/skill/skillservices.service';

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
  skillservices = inject(SkillservicesService)
  employedata: any;
  paymentdata: any;
  dialgo = inject(MatDialog)
  skills : any[] = [];
  profileImageUrl = '';
  ngOnInit() {
    this.getData();
  }

  getData(){
    const userId = localStorage.getItem('employeeId');
    if (userId) {
      this.services.getData().subscribe((response: any) => {
        const allEmployees = response.data;
        this.employedata = allEmployees.find((emp: any) => emp.id == userId);
        // console.log("Found employedata:", this.employedata);
        if (this.employedata?.profileImage) {
          this.profileImageUrl =
            this.services.apiUrl.replace('/api', '') + "/ProfileImages/" +
            this.employedata.profileImage;
        }
      });
      this.bankinfoloadedata();

    } else {
      this.router.navigate(['/login']); // fallback
    }
  }

  bankinfoloadedata() {
    const userId = localStorage.getItem('employeeId');
    this.paymentservices.getAllData().subscribe((response: any) => {
      const allpayment = response.data;
      // console.log("All payments:", allpayment);
      //console.log('User Id:', userId);  
      //console.log('Payment Records:', response.data);
      this.paymentdata = allpayment.find((pay: any) => pay.employeeId == userId);
     //console.log("Found paymentdata:", this.paymentdata);
    })
  }

  info(data: any) {
    const dialogRef = this.dialgo.open(InformationComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  contact(data: any) {
    const dialogRef = this.dialgo.open(EmergencyComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  education(data : any) {
    const dialogRef = this.dialgo.open(EducationDetailsComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  experience(data : any) {
    const dialogRef = this.dialgo.open(ExperienceComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  bankinfo(data: any) {
    const dialogRef = this.dialgo.open(PaymeenInfoComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }

  passportinfo(data: any) {
    const dialogRef = this.dialgo.open(PassportinfoComponent, {
      data,
    })
    dialogRef.afterClosed().subscribe({
      next: (val) => {
        this.getData();
      }
    })
  }
}

