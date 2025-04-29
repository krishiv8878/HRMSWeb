import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [MatCardModule, MatIcon, AgGridAngular, CommonModule, MatButton],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss'
})
export class EmployeeAttendanceComponent {
  constructor() { }
  cards = [
    { title: 'Average Working Hour', time: '08:00', icon: 'work', color: 'purple', bgColor: '#87008726', borderColor: '#80008030' },
    { title: 'Average In Time', time: '10:30 AM', icon: 'access_time', color: 'blue', bgColor: '#0000FF26', borderColor: '#0000FF30' },
    { title: 'Average Out Time', time: '07:30 PM', icon: 'pause_circle_outline', color: 'green', bgColor: '#00800026', borderColor: '#00800030' },
    { title: 'Average Break Time', time: '01:00', icon: 'hourglass_empty', color: 'orange', bgColor: '#FFA50026', borderColor: '#FFA50030' }
  ];

  columnDefs: ColDef[] = [
    { headerName: 'DATE', field: 'date', },
    { headerName: 'CHECK IN', field: 'checkIn', },
    { headerName: 'CHECK OUT', field: 'checkOut', },
    { field: "totalHours", },
    { field: "effectiveHours", },
    { field: "", cellRenderer: () => { return `<p class="gross-btn">...</p>`; }, }


  ];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [5, 10, 20];
  
  defaultColDef = {
    resizable: true,
    flex: 1
  };

  rowData = [
    { date: '22 OCT, 2020', checkIn: '05:51 am', checkOut: '12:01 pm', totalHours: '01:15 hr', effectiveHours: '01:15 hr' },
    { date: '1 FEB, 2020', checkIn: '01:08 pm', checkOut: '05:49 pm', totalHours: '01:15 hr', effectiveHours: '01:15 hr' },
    { date: '8 SEP, 2020', checkIn: '05:36 pm', checkOut: '11:23 pm', totalHours: '01:15 hr', effectiveHours: '01:15 hr' },
    { date: '21 SEP, 2020', checkIn: '11:49 pm', checkOut: '07:40 am', totalHours: '01:15 hr', effectiveHours: '01:15 hr' },
    { date: '17 OCT, 2020', checkIn: '02:02 am', checkOut: '11:49 pm', totalHours: '01:15 hr', effectiveHours: '01:15 hr' },
    { date: '24 MAY, 2020', checkIn: '02:34 am', checkOut: '10:41 pm', totalHours: '01:15 hr', effectiveHours: '01:15 hr' }
  ];
  onClockIn() { }
}
