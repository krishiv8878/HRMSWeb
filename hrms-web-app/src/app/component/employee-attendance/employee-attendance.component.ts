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
  createdDate: any;

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
    { field: "totalHours", valueFormatter: (params) => params.value ? this.formateHrs(params.value) : "" },
    { field: "effectiveHours", valueFormatter: (params) => params.value ? this.formateHrs(params.value) : "" },
    {
      field: "", cellRenderer: () => `<p class="gross-btn">...</p>`,
      onCellClicked: (params) => this.openGrossModal(params)
    }
  ];

  getISODateOnly = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  //formate totalhours and EffectiveHours from decimal to HH:mm
  formateHrs(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');

    return `${h}:${m}`;
  }

  //formate clockin and clockout time to HH:mm
  formatHours = (time: string): string => {
    if (!time) return "";
    let timeString = time;
    if (!timeString.endsWith("Z") && !timeString.includes("+")) {
      timeString += "Z";
    }
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  ngOnInit() {
    const storedId = localStorage.getItem("employeeId");
    if (storedId) {
      this.employeeId = storedId;
      this.getAllData();
    } else {
      console.error("No employee ID found in localStorage.");
    }
  }


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
    const user = localStorage.getItem("employeeId");
    if (user) {
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
        response.data.filter((item: any) => item.employeeId == this.employeeId)
          .forEach((item: any) => {
            const itemDate = new Date(item.clockIn);
            const formattedDate = this.formatDate(itemDate);
            const index = this.rowData.findIndex(row => row.Date === formattedDate);
            if (index !== -1) {
              this.rowData[index].clockIn = item.clockIn;
              this.rowData[index].clockOut = item.clockOut;
              this.rowData[index].totalHours = item.totalHours || "";
              this.rowData[index].effectiveHours = item.effectiveHours || "";
            }
            if ((new Date(item.createdDate).toDateString === today.toDateString) && (item.clockOut === null && item.clockIn !== null)) {
              this.isClockedIn = true;
              this.createdDate = item.createdDate;
              console.log(this.isClockedIn)
            }
          });
      });
    }

  }

  // Format date to "dd-MMM (Week Off)" if weekend
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', weekday: 'short' };
    const formattedDate = date.toLocaleDateString('en-GB', options);
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? `${formattedDate} (Week Off)` : formattedDate;
  }

  // Clock In
  openClockInDialog() {
    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '500px',
      data: {
        title: 'Confirm Clock-In',
        message: 'Are you sure you want to clock in?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.startClock();
      }
    });
  }

  // Clock Out
  openClockOutDialog() {
    const dialogRef = this.dialog.open(EmployeeAttendComponent, {
      width: '500px',
      data: {
        title: 'Confirm Clock-Out',
        message: 'Are you sure you want to clock out?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.onClockOut();
      }
    });
  }

  firstClockIn: Date | null = null;

  // Start clock-in process
  startClock() {
    const now = new Date();
    const totalDecimalHours = 0;
    this.isClockedIn = true;
    this.firstClockIn = now;

    const todayFormatted = this.formatDate(now);
    const todayRow = this.rowData.find(row => row.Date === todayFormatted);
    if (todayRow) {
      todayRow.clockIn = now.toISOString();
    }
    this.services.createData(
      this.employeeId,
      now.toISOString(),
      null,
      totalDecimalHours,
      totalDecimalHours,
      "Present",
      null,
      this.getISODateOnly()
    ).subscribe(response => {
      console.log("Attendance Saved:", response);
      this.getAllData();
    });
  }

  // Clock out and calculate total and effective hours
  onClockOut() {
    const clockOutTime = new Date();

    this.isClockedIn = false;
    clearInterval(this.interval);
    const totalDecimalHours = 0;
    const clockInTime = new Date();
    // const diffMs = clockOutTime.getTime() - this.firstClockIn.getTime();

    // const hours = Math.floor(diffMs / (1000 * 60 * 60));
    // const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    // const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    // const durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // const totalDecimalHours = diffMs / (1000 * 60 * 60);
    // const todayStr = new Date().toISOString().split("T")[0];
    // const fullDateTimeStr = `${todayStr}T${durationStr}`;
    const todayFormatted = this.formatDate(new Date());
    const todayRow = this.rowData.find(row => row.Date === todayFormatted);
    if (todayRow) {
      todayRow.clockOut = clockOutTime.toISOString();
      // todayRow.totalHours = totalDecimalHours;
      // todayRow.effectiveHours = totalDecimalHours;
    }

    this.services.createData(
      this.employeeId,
      clockInTime.toISOString(),
      clockOutTime.toISOString(),
      totalDecimalHours,
      totalDecimalHours,
      "Present",
      this.createdDate,
      this.getISODateOnly()
    ).subscribe(response => {
      console.log("Attendance Saved:", response);
      this.getAllData();
    });
  }
}
