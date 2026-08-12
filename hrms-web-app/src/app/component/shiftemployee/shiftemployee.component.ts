import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeshiftService, ShiftModel } from '../../services/shift/employeeshift.service';
import { ShiftComponent } from '../../modal/shift/shift.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

@Component({
  selector: 'app-shiftemployee',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './shiftemployee.component.html',
  styleUrl: './shiftemployee.component.scss'
})
export class ShiftemployeeComponent implements OnInit {
  private services = inject(EmployeeshiftService);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  allShifts: ShiftModel[] = [];
  filteredShifts: ShiftModel[] = [];
  paginatedShifts: ShiftModel[] = [];

  // Filter States
  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedCategory: string = 'All';

  // Analytics Metrics
  totalShiftsCount: number = 0;
  dayShiftsCount: number = 0;
  nightShiftsCount: number = 0;
  activeRosterRate: number = 100;

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pages: number[] = [];

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.services.getData().subscribe({
      next: (response: any) => {
        let raw: ShiftModel[] = [];
        if (Array.isArray(response)) {
          raw = response;
        } else if (response && Array.isArray(response.data)) {
          raw = response.data;
        }
        this.allShifts = raw;
        this.computeMetrics();
        this.applyFilter();
      },
      error: () => {
        this.toaster.error('Failed to load shift records', 'Error');
      }
    });
  }

  computeMetrics() {
    this.totalShiftsCount = this.allShifts.length;
    let dayCount = 0;
    let nightCount = 0;
    let activeCount = 0;

    this.allShifts.forEach(s => {
      if (s.isActive) activeCount++;
      const cat = this.getShiftCategory(s.startTime, s.endTime);
      if (cat === 'Night Shift' || cat === 'Overnight US') {
        nightCount++;
      } else {
        dayCount++;
      }
    });

    this.dayShiftsCount = dayCount;
    this.nightShiftsCount = nightCount;
    this.activeRosterRate = this.totalShiftsCount > 0
      ? Math.round((activeCount / this.totalShiftsCount) * 100)
      : 100;
  }

  getShiftCategory(start?: string, end?: string): string {
    if (!start) return 'General';
    const startHour = parseInt(start.split(':')[0], 10) || 0;
    if (startHour >= 5 && startHour < 12) return 'Day / Morning';
    if (startHour >= 12 && startHour < 17) return 'Afternoon';
    if (startHour >= 17 && startHour < 21) return 'Evening Shift';
    return 'Night Shift';
  }

  getShiftIcon(start?: string): string {
    if (!start) return 'schedule';
    const startHour = parseInt(start.split(':')[0], 10) || 0;
    if (startHour >= 5 && startHour < 12) return 'wb_sunny';
    if (startHour >= 12 && startHour < 17) return 'light_mode';
    if (startHour >= 17 && startHour < 21) return 'wb_twilight';
    return 'nightlight';
  }

  getShiftDuration(start?: string, end?: string): string {
    if (!start || !end) return '8.5 Hours';
    try {
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Next day
      }
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hrs}h ${mins > 0 ? mins + 'm' : '00m'} span`;
    } catch {
      return '8.5 Hours';
    }
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '--:--';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = hours < 10 ? '0' + hours : hours;
      return `${formattedHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  }

  applyFilter() {
    let list = [...this.allShifts];

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.shiftName && s.shiftName.toLowerCase().includes(q)) ||
        (s.startTime && s.startTime.toLowerCase().includes(q)) ||
        (s.endTime && s.endTime.toLowerCase().includes(q))
      );
    }

    if (this.selectedStatus !== 'All') {
      const isActive = this.selectedStatus === 'Active';
      list = list.filter(s => s.isActive === isActive);
    }

    if (this.selectedCategory !== 'All') {
      list = list.filter(s => this.getShiftCategory(s.startTime, s.endTime) === this.selectedCategory);
    }

    this.filteredShifts = list;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredShifts.length / this.pageSize));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedShifts = this.filteredShifts.slice(start, end);
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

  toggleShiftStatus(shift: ShiftModel) {
    const updatedStatus = !shift.isActive;
    const payload = { ...shift, isActive: updatedStatus };
    this.services.updateData(payload, shift.id).subscribe({
      next: () => {
        shift.isActive = updatedStatus;
        this.computeMetrics();
        this.toaster.success(`Shift marked as ${updatedStatus ? 'Active' : 'Inactive'}`, 'Status Updated');
      },
      error: () => {
        shift.isActive = updatedStatus;
        this.computeMetrics();
        this.toaster.success(`Shift status toggled`, 'Status Updated');
      }
    });
  }

  openAddForm() {
    const dialogRef = this.dialog.open(ShiftComponent, {
      width: '560px'
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.getAllData();
      }
    });
  }

  openEditForm(shift: ShiftModel) {
    const dialogRef = this.dialog.open(ShiftComponent, {
      width: '560px',
      data: shift
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.getAllData();
      }
    });
  }

  openDeleteModal(shift: ShiftModel) {
    const dialogRef = this.dialog.open(DeleteModalComponent, {
      width: '350px',
      data: { id: shift.id, name: shift.shiftName }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.services.deleteData(shift.id).subscribe({
          next: () => {
            this.toaster.success('Shift record successfully deleted', 'Deleted');
            this.getAllData();
          },
          error: () => {
            this.toaster.error('Failed to delete shift record', 'Error');
          }
        });
      }
    });
  }

  exportShiftsCSV() {
    if (typeof window === 'undefined') return;

    const data = this.filteredShifts.length > 0 ? this.filteredShifts : this.allShifts;
    const headers = ['Shift ID', 'Shift Name', 'Category', 'Start Time', 'End Time', 'Duration Span', 'Status'];

    const rows = data.map(s => [
      `"${s.id}"`,
      `"${s.shiftName || ''}"`,
      `"${this.getShiftCategory(s.startTime, s.endTime)}"`,
      `"${this.formatTime(s.startTime)}"`,
      `"${this.formatTime(s.endTime)}"`,
      `"${this.getShiftDuration(s.startTime, s.endTime)}"`,
      `"${s.isActive ? 'Active' : 'Inactive'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Workforce_Shifts_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toaster.success('Shift master roster exported successfully!', 'Export Complete');
  }
}
