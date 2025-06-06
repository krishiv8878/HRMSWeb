import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams, RowClassParams, RowStyle } from 'ag-grid-community';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeAttendComponent } from '../../modal/employee-attend/employee-attend.component';
import { AttendaseditComponent } from '../../modal/attendasedit/attendasedit.component';

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [MatCardModule, MatIcon, AgGridAngular, CommonModule, MatButton],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent {
  // Injecting services
  services = inject(EmployeeeService);
  router = inject(Router);
  dialog = inject(MatDialog);

  // Component state
  isClockedIn: boolean = false;
  employeeId: any;
  rowData: any[] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];
  interval: any;

  // Default AG Grid column configuration
  defaultColDef = {
    resizable: true,
    flex: 1
  };

  // Dashboard card summary
  cards = [
    { title: 'Average Working Hour', time: '08:00', icon: 'work', color: 'purple', bgColor: '#87008726', borderColor: '#80008030' },
    { title: 'Average In Time', time: '10:30 AM', icon: 'access_time', color: 'blue', bgColor: '#0000FF26', borderColor: '#0000FF30' },
    { title: 'Average Out Time', time: '07:30 PM', icon: 'pause_circle_outline', color: 'green', bgColor: '#00800026', borderColor: '#00800030' },
    { title: 'Average Break Time', time: '01:00', icon: 'hourglass_empty', color: 'orange', bgColor: '#FFA50026', borderColor: '#FFA50030' }
  ];

  // Row styling for weekends
  getRowStyle(params: RowClassParams): RowStyle | undefined {
    if (params?.data?.Date?.includes('Week Off')) {
      return { backgroundColor: '#e1e1e1' };
    }
    return undefined;
  }

  // AG Grid column definitions
  columnDefs: ColDef[] = [
    {
      headerName: 'Date', field: 'Date',
      cellRenderer: (params: ICellRendererParams) => {
        if (params.data?.isWeekend || params.value?.includes('Week Off')) {
          return `<div class="weekoff-cell" style="font-weight: 600;">${params.value}</div>`;
        }
        return params.value;
      }
    },
    { headerName: 'Check In', field: 'clockIn', valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { headerName: 'Check Out', field: 'clockOut', valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { field: "totalHours", valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    { field: "effectiveHours", valueFormatter: (params) => params.value ? this.formatHours(params.value) : "" },
    {
      field: "", cellRenderer: () => `<p class="gross-btn">...</p>`,
      onCellClicked: (params) => this.openGrossModal(params)
    }
  ];

  // Format "HH:mm" or ISO time to readable 12-hour format
  formatHours = (time: string): string => {
    let date: Date;
    if (time.includes('T')) {
      date = new Date(time);
    } else {
      const [h = '00', m = '00'] = time.split(':');
      date = new Date();
      date.setHours(+h);
      date.setMinutes(+m);
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Lifecycle hook to load initial data

  ngOnInit() {
    this.getAllData();

    const storedClockIn = localStorage.getItem('clockInTime');
    const isClockedInStored = localStorage.getItem('isClockedIn');

    const employeeIdFromStorage = localStorage.getItem('employeeId');
    if (employeeIdFromStorage) {
      this.employeeId = employeeIdFromStorage;
    }

    if (storedClockIn && isClockedInStored === 'true') {
      this.firstClockIn = new Date(storedClockIn);
      this.isClockedIn = true;
    }
  }


  // Open edit modal for selected row
  openGrossModal(params: any) {
    if (params.data?.Date) {
      this.dialog.open(AttendaseditComponent, {
        width: '600px',
        height: '100vh',
        position: { right: '0px' },
        data: params.data
      });
    }
  }

  // Load all attendance records
  getAllData() {
    this.services.getAllData().subscribe((response: any) => {
      const today = new Date();
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - i);
        return date;
      });

      this.rowData = last30Days.map((date) => ({
        Date: this.formatDate(date),
        clockIn: "",
        clockOut: "",
        totalHours: "",
        effectiveHours: ""
      }));

      // Merge API data with generated date rows
      response.data.forEach((item: any) => {
        const formattedDate = this.formatDate(new Date(item.clockIn)); 
        const index = this.rowData.findIndex(row => row.Date === formattedDate);
        if (index !== -1) {
          this.rowData[index].clockIn = item.clockIn ? this.formatHours(item.clockIn) : ""; 
          this.rowData[index].clockOut = item.clockOut ? this.formatHours(item.clockOut) : "";
          this.rowData[index].totalHours = item.totalHours || "";
          this.rowData[index].effectiveHours = item.effectiveHours || "";
        }
      });
    });
  }

  // Format date to "dd-MMM (Week Off)" if weekend
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', weekday: 'short' };
    const formattedDate = date.toLocaleDateString('en-GB', options);
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? `${formattedDate} (Week Off)` : formattedDate;
  }

  // Open clock-in confirmation dialog
  openClockInDialog() {
    const dialogRef = this.dialog.open(EmployeeAttendComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.startClock();
      }
    });
  }

  firstClockIn: Date | null = null;

  // Start clock-in process
  startClock() {
    if (!this.firstClockIn) {
      this.firstClockIn = new Date();
      localStorage.setItem('clockInTime', this.firstClockIn.toISOString());
    }
    this.isClockedIn = true;
    localStorage.setItem('isClockedIn', 'true');

    const now = new Date();
    const todayFormatted = this.formatDate(now);
    const clockInTime = this.formatHours(now.toISOString());

    const todayRow = this.rowData.find(row => row.Date === todayFormatted);
    if (todayRow) {
      todayRow.clockIn = clockInTime;
    }    
  }

  // Clock out and calculate total and effective hours
  onClockOut() {
    if (!this.firstClockIn) {
      console.log("You need to clock in first!");
      return;
    }

    const clockOutTime = new Date();
    this.isClockedIn = false;
    clearInterval(this.interval);

    // Clear local storage 
    localStorage.removeItem('isClockedIn');
    localStorage.removeItem('clockInTime');

    const localStartTime = new Date(this.firstClockIn.getTime() - (this.firstClockIn.getTimezoneOffset() * 60000));
    const localEndTime = new Date(clockOutTime.getTime() - (clockOutTime.getTimezoneOffset() * 60000));

    const diffMs = localEndTime.getTime() - localStartTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const todayStr = new Date().toISOString().split("T")[0]; // e.g. 2025-06-03
    const fullDateTimeStr = `${todayStr}T${durationStr}`; // e.g. 2025-06-03T01:23:45

    // Update row in UI
    const todayFormatted = this.formatDate(new Date());
    const todayRow = this.rowData.find(row => row.Date === todayFormatted);
    if (todayRow) {
      todayRow.clockOut = this.formatHours(localEndTime.toISOString());
      todayRow.totalHours = durationStr;
      todayRow.effectiveHours = durationStr;
    }

    // API Call
    this.services.createData(
      this.employeeId,
      localStartTime.toISOString(),
      localEndTime.toISOString(),
      fullDateTimeStr, // totalHours
      fullDateTimeStr, // effectiveHours
      "Present"
    ).subscribe(response => {

      console.log("Attendance Saved:", response);
      this.getAllData(); // Refresh table
    });
  }
}
