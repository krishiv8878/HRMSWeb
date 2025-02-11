import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, MatButtonModule, CommonModule],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent {
  services = inject(EmployeeeService)
  router = inject(Router)

  public columnDefs: ColDef[] = [
    { field: "id", floatingFilter: true, filter: true },
    { field: "employeeId", floatingFilter: true, filter: true },
    { field: "clockIn", floatingFilter: true, filter: true },
    { field: "clockOut", floatingFilter: true, filter: true },
    { field: "totalHours", floatingFilter: true, filter: true },
  ]

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.services.getAllData().subscribe((response: any) => {
      this.rowData = response.data
    })
  }
  rowData: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];
  data: any;
  defaultColDef: ColDef = {
    resizable: true
  };

  employeeId= 0;
  startTime: Date | null = null;
  runningTime: string = '00:00:00';
  totalHours: number | null = null;
  interval: any;

  startClock() {
    this.services.createData(this.employeeId, 'start').subscribe((response) => {
      this.startTime = new Date(response.timestamp);
      this.totalHours = null;
      this.updaterunigtime()

      this.interval = setInterval(() => {
        this.updaterunigtime();
      }, 1000)
    })
  }
  stopClock() { }

  private updaterunigtime() {
    if (this.startTime) {
      const now = new Date;
      const diff = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      const hours = Math.floor(diff / 3600)
      const minuites = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      this.runningTime =
        `${String(hours).padStart(2, '0')}:${String(minuites).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  openAddForm() { }
}


