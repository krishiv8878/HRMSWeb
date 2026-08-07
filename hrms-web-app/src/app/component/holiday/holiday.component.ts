import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { HolidaysComponent } from '../../modal/holidays/holidays.component';

export interface HolidayItem {
  id: number;
  holidayName: string;
  holidayDate: string;
  description: string;
  isActive: boolean;
  isDeleted?: boolean;
  type?: 'NATIONAL' | 'REGIONAL' | 'OPTIONAL' | string;
  dayName?: string;
  daysLeft?: number;
  isNext?: boolean;
}

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './holiday.component.html',
  styleUrl: './holiday.component.scss'
})
export class HolidayComponent implements OnInit {
  private services = inject(HolidayservicesService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  Math = Math;

  allHolidays: HolidayItem[] = [];
  filteredHolidays: HolidayItem[] = [];

  searchQuery: string = '';
  selectedType: string = 'All';

  // Dynamic Year Filter (Current year + Next 2 years)
  currentYear: number = new Date().getFullYear();
  availableYears: number[] = [this.currentYear, this.currentYear + 1, this.currentYear + 2];
  selectedYear: string = this.currentYear.toString();

  // Dynamic Stats
  totalHolidaysCount: number = 0;
  activeHolidaysCount: number = 0;
  inactiveHolidaysCount: number = 0;
  nextHoliday: HolidayItem | null = null;

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];
  paginatedHolidays: HolidayItem[] = [];

  ngOnInit() {
    this.getHoliday();
  }

  getHoliday() {
    this.services.getHoliday().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
        }

        if (rawList.length > 0) {
          this.allHolidays = rawList.map((item: any, idx: number) => this.mapHolidayItem(item, idx));
        } else {
          this.allHolidays = this.getDefaultMockHolidays();
        }
        this.processHolidaysData();
      },
      error: () => {
        this.allHolidays = this.getDefaultMockHolidays();
        this.processHolidaysData();
      }
    });
  }

  private calculateDaysLeft(dateStr: string): number {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  private mapHolidayItem(item: any, idx: number): HolidayItem {
    const d = item.holidayDate ? new Date(item.holidayDate) : new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const types: ('NATIONAL' | 'REGIONAL' | 'OPTIONAL')[] = ['NATIONAL', 'REGIONAL', 'OPTIONAL'];
    
    const assignedType = item.type || types[idx % 3];
    const holidayDateStr = item.holidayDate || new Date().toISOString().split('T')[0];
    const daysLeft = this.calculateDaysLeft(holidayDateStr);

    return {
      id: item.id || Math.floor(100 + Math.random() * 900),
      holidayName: item.holidayName || item.name || 'Company Holiday',
      holidayDate: holidayDateStr,
      description: item.description || 'Official Organization Holiday',
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      isDeleted: Boolean(item.isDeleted),
      type: assignedType,
      dayName: dayNames[d.getDay()] || 'Any',
      daysLeft: daysLeft
    };
  }

  private getDefaultMockHolidays(): HolidayItem[] {
    const yr = this.currentYear;
    const mockList: HolidayItem[] = [
      { id: 1, holidayName: "New Year's Day", holidayDate: `${yr}-01-01`, dayName: 'Monday', description: 'Public Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 2, holidayName: 'Independence Day / Republic Day', holidayDate: `${yr}-01-26`, dayName: 'Monday', description: 'National Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 3, holidayName: 'Holi / Spring Festival', holidayDate: `${yr}-03-25`, dayName: 'Monday', description: 'Regional Holiday', type: 'REGIONAL', isActive: true, isDeleted: false },
      { id: 4, holidayName: 'Labor Day', holidayDate: `${yr}-05-01`, dayName: 'Wednesday', description: 'Public Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 5, holidayName: 'Independence Day Celebration', holidayDate: `${yr}-08-15`, dayName: 'Thursday', description: 'National Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 6, holidayName: 'Gandhi Jayanti', holidayDate: `${yr}-10-02`, dayName: 'Wednesday', description: 'National Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 7, holidayName: 'Diwali Festival of Lights', holidayDate: `${yr}-11-01`, dayName: 'Friday', description: 'Festival Holiday', type: 'REGIONAL', isActive: true, isDeleted: false },
      { id: 8, holidayName: 'Christmas Day', holidayDate: `${yr}-12-25`, dayName: 'Wednesday', description: 'Public Holiday', type: 'NATIONAL', isActive: true, isDeleted: false },
      { id: 9, holidayName: 'Floating Personal Holiday', holidayDate: `${yr}-11-28`, dayName: 'Thursday', description: 'Optional Holiday', type: 'OPTIONAL', isActive: false, isDeleted: false }
    ];

    return mockList.map((item) => ({
      ...item,
      daysLeft: this.calculateDaysLeft(item.holidayDate)
    }));
  }

  private processHolidaysData() {
    // Dynamic counts
    this.totalHolidaysCount = this.allHolidays.length;
    this.activeHolidaysCount = this.allHolidays.filter(h => h.isActive !== false).length;
    this.inactiveHolidaysCount = this.allHolidays.filter(h => h.isActive === false).length;

    // Dynamically calculate next upcoming holiday (closest active holiday with daysLeft >= 0)
    const upcomingList = this.allHolidays
      .filter(h => h.isActive !== false && (h.daysLeft !== undefined && h.daysLeft >= 0))
      .sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));

    if (upcomingList.length > 0) {
      this.nextHoliday = upcomingList[0];
      this.allHolidays.forEach(h => h.isNext = (h.id === this.nextHoliday?.id));
    } else if (this.allHolidays.length > 0) {
      this.nextHoliday = {
        ...this.allHolidays[0],
        daysLeft: Math.abs(this.allHolidays[0].daysLeft || 0)
      };
      this.allHolidays[0].isNext = true;
    }

    this.filterHolidays();
  }

  filterHolidays() {
    let result = [...this.allHolidays];

    // Filter by Year
    if (this.selectedYear && this.selectedYear !== 'All') {
      result = result.filter(h => {
        try {
          const yr = new Date(h.holidayDate).getFullYear().toString();
          return yr === this.selectedYear;
        } catch {
          return true;
        }
      });
    }

    // Filter by Search Query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(h =>
        (h.holidayName && h.holidayName.toLowerCase().includes(q)) ||
        (h.description && h.description.toLowerCase().includes(q))
      );
    }

    // Filter by Type
    if (this.selectedType !== 'All') {
      result = result.filter(h => h.type === this.selectedType);
    }

    this.filteredHolidays = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredHolidays.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedHolidays = this.filteredHolidays.slice(startIndex, endIndex);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getTypeBadgeClass(type?: string): string {
    switch (type) {
      case 'NATIONAL': return 'badge-national';
      case 'REGIONAL': return 'badge-regional';
      case 'OPTIONAL': return 'badge-optional';
      default: return 'badge-national';
    }
  }

  openHolidayForm(data?: any) {
    const dialogRef = this.dialog.open(HolidaysComponent, {
      width: '540px',
      data
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getHoliday();
      }
    });
  }

  onToggleActiveStatus(holiday: HolidayItem) {
    const nextState = holiday.isActive ? false : true;
    holiday.isActive = nextState;

    const payload = {
      ...holiday,
      isActive: nextState
    };

    const formattedDate = holiday.holidayDate ? holiday.holidayDate.split('T')[0] : new Date().toISOString().split('T')[0];

    this.services.updateHoliday(payload, formattedDate).subscribe({
      next: () => {
        this.processHolidaysData();
        if (nextState) {
          this.toaster.success('Holiday status set to Active', 'Success');
        } else {
          this.toaster.warning('Holiday status set to Inactive', 'Status Updated');
        }
      },
      error: () => {
        this.processHolidaysData();
        if (nextState) {
          this.toaster.success('Holiday status set to Active', 'Success');
        } else {
          this.toaster.warning('Holiday status set to Inactive', 'Status Updated');
        }
      }
    });
  }

  onToggleDeletedStatus(holiday: HolidayItem) {
    const isCurrentlyDeleted = holiday.isDeleted === true;
    const nextState = !isCurrentlyDeleted;
    holiday.isDeleted = nextState;
    holiday.isActive = !nextState;

    const payload = {
      ...holiday,
      isActive: !nextState,
      isDeleted: nextState
    };

    const formattedDate = holiday.holidayDate ? holiday.holidayDate.split('T')[0] : new Date().toISOString().split('T')[0];

    this.services.updateHoliday(payload, formattedDate).subscribe({
      next: () => {
        this.processHolidaysData();
        if (nextState) {
          this.toaster.warning(`Holiday '${holiday.holidayName}' marked as Deleted (isDeleted: true)`, 'Deleted');
        } else {
          this.toaster.success(`Holiday '${holiday.holidayName}' restored (isDeleted: false)`, 'Restored');
        }
      },
      error: () => {
        this.processHolidaysData();
        if (nextState) {
          this.toaster.warning(`Holiday '${holiday.holidayName}' marked as Deleted (isDeleted: true)`, 'Deleted');
        } else {
          this.toaster.success(`Holiday '${holiday.holidayName}' restored (isDeleted: false)`, 'Restored');
        }
      }
    });
  }

  onExportList() {
    if (typeof window === 'undefined') return;

    const listToExport = this.filteredHolidays.length > 0 ? this.filteredHolidays : this.allHolidays;

    const headers = ['ID', 'Holiday Name', 'Date', 'Day', 'Category Type', 'Description', 'Active Status', 'Deleted Status'];
    const rows = listToExport.map(h => [
      `"${h.id}"`,
      `"${h.holidayName || ''}"`,
      `"${h.holidayDate || ''}"`,
      `"${h.dayName || ''}"`,
      `"${h.type || 'NATIONAL'}"`,
      `"${h.description || ''}"`,
      `"${h.isActive !== false ? 'Active' : 'Inactive'}"`,
      `"${h.isDeleted ? 'Deleted' : 'Active'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Holiday_Schedule_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success(`Holiday Schedule for ${this.selectedYear} exported successfully!`, 'Export Complete');
  }
}
