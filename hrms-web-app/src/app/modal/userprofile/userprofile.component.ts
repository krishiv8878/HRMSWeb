import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCard, MatCardModule } from '@angular/material/card';
import { EmployeeService } from '../../services/employee/employee.service';
import { Router } from '@angular/router';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardModule],
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

  ngOnInit() {
    const userId = localStorage.getItem('employeeId');

    if (userId) {
      this.services.getData().subscribe((response: any) => {
        const allEmployees = response.data;
        this.employedata = allEmployees.find((emp: any) => emp.id == userId);
      });

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
}

