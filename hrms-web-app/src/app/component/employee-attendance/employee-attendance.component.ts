import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams, RowClassParams } from 'ag-grid-community';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeAttendComponent } from '../../modal/employee-attend/employee-attend.component';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';
import { RowStyle } from 'ag-grid-community';

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [MatCardModule, MatIcon, AgGridAngular, CommonModule, MatButton],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent {
  constructor() { }

  // Injecting required services
  services = inject(EmployeeeService)
  router = inject(Router)
  dialog = inject(MatDialog)
  isClockedIn: boolean = false;
  employeeId = 1;
  rowData: any[] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];
  interval: any;
  defaultColDef = {
    resizable: true,
    flex: 1
  };

  cards = [
    { title: 'Average Working Hour', time: '08:00', icon: 'work', color: 'purple', bgColor: '#87008726', borderColor: '#80008030' },
    { title: 'Average In Time', time: '10:30 AM', icon: 'access_time', color: 'blue', bgColor: '#0000FF26', borderColor: '#0000FF30' },
    { title: 'Average Out Time', time: '07:30 PM', icon: 'pause_circle_outline', color: 'green', bgColor: '#00800026', borderColor: '#00800030' },
    { title: 'Average Break Time', time: '01:00', icon: 'hourglass_empty', color: 'orange', bgColor: '#FFA50026', borderColor: '#FFA50030' }
  ];

  getRowStyle(params: RowClassParams): RowStyle | undefined {
    if (params?.data?.Date?.includes('Week Off')) {
      return { backgroundColor: '#e1e1e1' };
    }
    return undefined;
  }


  columnDefs: ColDef[] = [
    {
      headerName: 'Date', field: 'Date',
      cellRenderer: (params: ICellRendererParams) => {
        if (params.data?.isWeekend || params.value?.includes('Week Off')) {
          return `<div class="weekoff-cell" style="font-weight: 600;">${params.value}</div>`;
        }
        return params.value;
      },
      // cellClass: (params) => params.value?.includes('Week Off'),
    },
    { headerName: 'Check In', field: 'clockIn', valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { headerName: 'Check Out', field: 'clockOut', valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { field: "totalHours", valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { field: "effectiveHours", valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    {
      field: "", cellRenderer: () => { return `<p class="gross-btn">...</p>`; },
      onCellClicked: (params) => this.openGrossModal(params)
    }
  ];

  //Show in clockIn, clockOut Time Formate
  formatAMPM(timeStr: string): string {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // 0 becomes 12
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  //Show in TotalHours, EffectiveHours Formate
  formatHours = (time: string) => {
    const [h = '00', m = '00'] = time?.includes('T')
      ? new Date(time).toTimeString().split(':')
      : time?.split(':') || [];
    return `${h.padStart(2, '0')}: ${m.padStart(2, '0')}`;
  }

  // Called when the component is initialized
  ngOnInit() {
    this.getAllData();
  }

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
  generateLast30Days() {
    const today = new Date();
    const data = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      const day = date.toLocaleString('en-US', { weekday: 'short' });
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
      });

      const isWeekend = day === 'Sat' || day === 'Sun';

      data.push({
        Date: `${formattedDate}, ${day}`,
        clockIn: '',
        clockOut: '',
        totalHours: '',
        effectiveHours: '',
        isWeekend,
      });
    }

    this.rowData = data.reverse(); // Most recent last
  }

  onClockIn() {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      weekday: 'short',
    }).replace(',', '');

    const index = this.rowData.findIndex((item) => item.Date.includes(today));
    if (index !== -1) {
      this.rowData[index].clockIn = `${now.getHours()}:${now.getMinutes()}`;
    }
  }

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
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', weekday: 'short', };
    const formattedDate = date.toLocaleDateString('en-GB', options);

    // Check if it's Saturday or Sunday
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return `${formattedDate} (Week Off)`;
    }

    return formattedDate;
  }

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
  startClock() {
    if (!this.firstClockIn) {
      this.firstClockIn = new Date(); // Store first clock-in only once
      console.log("First Clock In Time Stored:", this.firstClockIn);
    }
    // this.startTime = new Date(); //  Ensure startTime is initialized
    this.isClockedIn = true; //  Mark as clocked in

    const now = new Date();
    // this.sessions.push({ clockIn: now, clockOut: null });    // Start a new session

    // Update UI immediately
    const todayFormatted = this.formatDate(new Date());
    const clockInTime = now.toLocaleTimeString('en-US', { hour12: false });

    const todayRow = this.rowData.find(row => row.Date === todayFormatted);
    if (todayRow) {
      todayRow.clockIn = clockInTime;
    }
  }
  onClockOut() {
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
    // const totalHoursFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    // Convert "hh:mm:ss" to today's full DateTime
    const todayDate = new Date().toISOString().split("T")[0]; // "2025-04-22"
    const totalHoursFormatted = new Date(`${todayDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    // const effectiveHours = totalHoursFormatted; // Assuming effectiveHours is the same for now
    const effectiveHours = totalHoursFormatted; // You can adjust logic if needed


    console.log("Total Hours:", totalHoursFormatted);
    // Convert to local time
    const localStartTime = new Date(this.firstClockIn.getTime() - (this.firstClockIn.getTimezoneOffset() * 60000));
    const localEndTime = new Date(lastClockOut.getTime() - (lastClockOut.getTimezoneOffset() * 60000));

    // API call to save attendance
    this.services.createData(
      this.employeeId,
      localStartTime.toISOString(),
      localEndTime.toISOString(),
      totalHoursFormatted.toISOString(),
      effectiveHours.toISOString(),
      "Present"
    ).subscribe(response => {
      const todayFormatted = this.formatDate(new Date());

      const todayRow = this.rowData.find(row => row.Date === todayFormatted);
      if (todayRow) {
        todayRow.clockOut = localEndTime.toLocaleTimeString('en-US', { hour12: false });
        todayRow.totalHours = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        todayRow.effectiveHours = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      console.log("Attendance Saved:", response);
      this.getAllData(); // Refresh the data
    });
  }
}
