import { Component, inject } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
// import { ActionComponent } from '../action/action.component';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeAttendComponent } from '../../modal/employee-attend/employee-attend.component';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule } from '@angular/forms';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';


@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [AgGridAngular, AgGridModule, MatButtonModule, CommonModule, MatCardModule, MatProgressBarModule, MatChipsModule, MatGridListModule, FormsModule],

  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent {

  // Injecting required services

  services = inject(EmployeeeService)
  router = inject(Router)
  dialog = inject(MatDialog)

  // Column definitions for AG Grid table

  public columnDefs: ColDef[] = [
    // { field: "id", floatingFilter: true, filter: true },
    // { field: "firstName", floatingFilter: true, filter: true },
    // { field: "lastName", floatingFilter: true, filter: true },
    { field: "Date", floatingFilter: true, filter: true },
    { field: "clockIn", floatingFilter: true, filter: true, },
    { field: "clockOut", floatingFilter: true, filter: true, },
    { field: "totalHours", floatingFilter: true, filter: true },
    {
      field: "groess", filter: true, cellRenderer: () => {
        return `<p class="gross-btn">...</p>`;
      },
      onCellClicked: (params) => this.openGrossModal(params)
    }
    // { field: "action", cellRenderer: ActionComponent, cellRendererParams: { Edit: this.Edit.bind(this) } }
  ]
  openGrossModal(params: any) {
    this.dialog.open(AttendaseditComponent, {
      width: '600px',
      height: '100vh',
      position: { right: '0px' },
      data: params.data // Employee data pass karna
    });
  }

  // Called when the component is initialized

  ngOnInit() {
    this.getAllData();
    this.runigtime();
    setInterval(() => {
      this.runigtime();
    }, 1000);
  }

  // Updates the current time every second

  runigtime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { hour12: true });
  }


  // Fetch all employee attendance data from API

  // getAllData() {
  //   this.services.getAllData().subscribe((response: any) => {
  //     this.rowData = response.data;
  //   })
  // }
  getAllData() {
    this.services.getAllData().subscribe((response: any) => {
      console.log("API Response:", response);
      this.rowData = response.data.map((item: any) => {
        return {
          Date: this.extractDate(item.clockIn),
          clockIn: item.clockIn ? new Date(item.clockIn).toLocaleTimeString('en-US', { hour12: false }) : "",
          clockOut: item.clockOut ? new Date(item.clockOut).toLocaleTimeString('en-US', { hour12: false }) : "",
          totalHours: item.totalHours || ""
        };
      });
    });
  }

  extractDate(dateString: string): string {
    if (!dateString) return "";
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? "" : parsedDate.toLocaleDateString('en-GB');
  }


  // Opens the edit modal for updating employee attendance data

  // Edit(data: any) {
  //   const dialogRef = this.dialog.open(AttendaseditComponent, {
  //     data,
  //   })
  //   dialogRef.afterClosed().subscribe({
  //     next: (val) => {
  //       this.getAllData();
  //     }
  //   })
  // }


  // Table row data and pagination configurations

  rowData: any[] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];
  data: any;


  // Default column properties
  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    minWidth: 120,
  };


  // Variables for displaying week days, working hours, and progress

  days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  currentDayIndex: number = new Date().getDay();
  startTimee: string = "10:00 AM";
  endTime: string = "7:00 PM";
  totalHourse: number = 8;
  progress: number = 0;
  employeeId = 1;
  startTime: Date | null = null;
  // runningTime: string = '00:00:00';
  totalHours: string = '';
  interval: any;
  currentTime: string = '';

  // Opens a modal to confirm employee clock-in

  openClockInDialog() {
    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.startClock();
      }
    })
  }

  // Starts the clock-in timer and tracks working hours

  startClock() {
    if (this.startTime) return;
    this.startTime = new Date();
    this.interval = setInterval(() => {
      this.updateProgress();
      this.updaterunigtime();
    }, 1000);
  }

  // Stops the clock-out timer, calculates total working hours, and saves the data

  stopClock() {
    if (this.startTime) {
      const endTime = new Date();
      const diffMs = endTime.getTime() - this.startTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      // this.totalHours = `${hours}h:${minutes}m`;
      const totalHoursFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      clearInterval(this.interval);
      // this.runningTime = '00:00:00';

      // API call to save attendance record

      this.services.createData(
        this.employeeId,
        this.startTime.toISOString(),
        endTime.toISOString(),
        totalHoursFormatted,
        "Present"
      ).subscribe(response => {
        console.log("Clock Stopped & Data Saved:", response);
        this.getAllData();
      });
      this.startTime = null;
    }
  }

  // Updates the running time display during clock-in

  updaterunigtime() {
    if (this.startTime) {
      const now = new Date();
      // this.currentTime = now.toLocaleTimeString();
      const diff = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      // const seconds = diff % 60;
      this.totalHours = `${hours}h:${minutes}m`;
      // this.runningTime =
      //   `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  // Updates the progress bar based on working hours

  updateProgress() {
    const currentTime = new Date();
    const [startHour, startMin] = this.convertTo24Hour(this.startTimee);
    const [endHour, endMin] = this.convertTo24Hour(this.endTime);

    const start = new Date();
    start.setHours(startHour, startMin, 0);
    const end = new Date();
    end.setHours(endHour, endMin, 0);

    if (currentTime < start) {
      this.progress = 0;
    } else if (currentTime > end) {
      this.progress = 100;
    } else {
      const elapsed = (currentTime.getTime() - start.getTime()) / (end.getTime() - start.getTime());
      this.progress = Math.round(elapsed * 100);
    }
  }

  // Converts 12-hour format time to 24-hour format

  convertTo24Hour(time: string): [number, number] {
    const [timePart, meridian] = time.split(" ");
    const [hours, minutes] = timePart.split(":").map(Number);
    let hour = hours;
    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;
    return [hour, minutes];
  }
  // openAddForm() { }
}


