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
  isClockedIn: boolean = false;

  // Column definitions for AG Grid table

  public columnDefs: ColDef[] = [
    // { field: "id", floatingFilter: true, filter: true },
    // { field: "firstName", floatingFilter: true, filter: true },
    // { field: "lastName", floatingFilter: true, filter: true },
    { field: "Date", },
    { field: "clockIn", valueFormatter: (params) => params.value ? this.formatClockIn(params.value) : "" },
    { field: "clockOut", valueFormatter: (params) => params.value ? this.formatClockIn(params.value) : "" },
    // { field: "totalHours", valueFormatter: (params) => params.value ? this.formatClockIn(params.value) : "" },
    { field: "totalHours", valueFormatter: (params) => params.value ? params.value : "" },
    { field: "effectiveHours", headerName: 'gross', valueFormatter: (params) => params.value ? params.value : "" },
    // { field: "gross", valueFormatter: (params) => params.value ? this.formatClockIn(params.value) : "" },
    {
      field: "", cellRenderer: () => { return `<p class="gross-btn">...</p>`; },
      onCellClicked: (params) => this.openGrossModal(params)
    }
  ]

  formatClockIn(timeStr: string): string {
    const [hh, mm] = timeStr.split(":").map(Number);
    return `${hh.toString().padStart(2, '0')}h ${mm.toString().padStart(2, '0')}m`;  //set time formate show in 01h 22m using in clockIn and clockOut,Total Hours
  }

  sessions: { clockIn: Date; clockOut: Date | null }[] = [];

  openGrossModal(params: any) {
    if (params.data && params.data.Date) {
      this.dialog.open(AttendaseditComponent, {
        width: '600px',
        height: '100vh',
        position: { right: '0px' },
        data: params.data // Employee data pass karna
      });
    }
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

  getAllData() {
    this.services.getAllData().subscribe((response: any) => {
      console.log("API Response:", response);

      // Get last 30 days with current date on top
      const today = new Date();
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - i);
        return date;
      });

      this.rowData = last30Days.map((date) => {
        return {
          Date: this.formatDate(date),
          clockIn: "",
          clockOut: "",
          totalHours: "",
          effectiveHours: ""
        };
      });

      // Map API response data into rowData based on the date
      response.data.forEach((item: any) => {
        const formattedDate = this.formatDate(new Date(item.clockIn));
        const index = this.rowData.findIndex(row => row.Date === formattedDate);
        if (index !== -1) {
          this.rowData[index].clockIn = item.clockIn
            ? new Date(item.clockIn).toLocaleTimeString('en-US', { hour12: false })
            : "";
          this.rowData[index].clockOut = item.clockOut
            ? new Date(item.clockOut).toLocaleTimeString('en-US', { hour12: false })
            : "";
          this.rowData[index].totalHours = item.totalHours || "";
          this.rowData[index].effectiveHours = item.effectiveHours || "";
        }
      });
    });
  }

  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' };
    const formattedDate = date.toLocaleDateString('en-GB', options);

    // Check if it's Saturday or Sunday
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return `${formattedDate} (Week Off)`;
    }

    return formattedDate;
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
  firstClockIn: Date | null = null;
  // lastClockOut: Date | null = null;

  // Starts the clock-in timer and tracks working hours

  startClock() {
    if (!this.firstClockIn) {
      this.firstClockIn = new Date(); // Store first clock-in only once
      console.log("First Clock In Time Stored:", this.firstClockIn);
    }
    this.startTime = new Date(); //  Ensure startTime is initialized
    this.isClockedIn = true; //  Mark as clocked in

    const now = new Date();
    this.sessions.push({ clockIn: now, clockOut: null });    // Start a new session

    this.interval = setInterval(() => {
      this.updateProgress();
      this.updaterunigtime();
    }, 1000);
  }

  // Stops the clock-out timer, calculates total working hours, and saves the data

  stopClock() {
    if (!this.firstClockIn) {
      console.log("You need to clock in first!");
      return; // Prevent clock-out if not clocked in
    }

    const lastClockOut = new Date(); //  Store last clock-out time
    console.log("Last Clock Out Time Stored:", lastClockOut);

    clearInterval(this.interval);
    this.isClockedIn = false; //  Mark as clocked out

    // Total Hours Calculation
    const diffMs = lastClockOut.getTime() - this.firstClockIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const totalHoursFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const effectiveHours = totalHoursFormatted; // Assuming effectiveHours is the same for now

    console.log("Total Hours:", totalHoursFormatted);
    // Convert to local time
    const localStartTime = new Date(this.firstClockIn.getTime() - (this.firstClockIn.getTimezoneOffset() * 60000));
    const localEndTime = new Date(lastClockOut.getTime() - (lastClockOut.getTimezoneOffset() * 60000));
    // API call to save attendance
    this.services.createData(
      this.employeeId,
      localStartTime.toISOString(),
      localEndTime.toISOString(),
      totalHoursFormatted,
      effectiveHours,
      "Present"
    ).subscribe(response => {
      console.log("Attendance Saved:", response);
      this.getAllData(); // Refresh the data
    });
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