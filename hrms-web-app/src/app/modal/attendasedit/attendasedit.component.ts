import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeeeService } from '../../services/attendance/employeee.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
@Component({
  selector: 'app-attendasedit',
  standalone: true,
  imports: [MatInputModule, MatButtonModule,MatFormField, MatDividerModule, ReactiveFormsModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatRadioModule, CommonModule],
  templateUrl: './attendasedit.component.html',
  styleUrl: './attendasedit.component.scss'
})
export class AttendaseditComponent {
  services = inject(EmployeeeService)
  formbuilder = inject(FormBuilder)
  toaster = inject(ToastrService)
  logs: { clockIn: string; clockOut: string }[] = [];
  canSubmit: boolean = true;
  statusMessage: string = '';
  currentStatus: string = '';
  rejectionReason: string = '';

  attendaseform = this.formbuilder.group({
    RequestType: ['Regularization', Validators.required],
    selectedDate: [{ value: new Date(), disabled: true }],
    Reason: ['', Validators.required],
    clockIn: [''],
    clockOut: ['']
  })

  constructor(private dialogref: MatDialogRef<AttendaseditComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    const parsedDate = this.parseInputDate(this.data);
    this.evaluateDateRegularization(parsedDate);

    this.attendaseform.patchValue({
      selectedDate: parsedDate,
      clockIn: this.data?.clockIn || '09:30',
      clockOut: this.data?.clockOut || '18:30',
    });

    this.attendaseform.get('selectedDate')?.valueChanges.subscribe((newDate: any) => {
      if (newDate instanceof Date) {
        this.evaluateDateRegularization(newDate);
      }
    });
  }

  evaluateDateRegularization(date: Date) {
    if (!date || isNaN(date.getTime())) return;
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const requests = Array.isArray(this.data?.existingRequests) ? this.data.existingRequests : [];
    const dateRequests = requests.filter((req: any) => {
      const rawDate = req.requestedDate || req.RequestedDate || req.attendanceDate || req.AttendanceDate;
      if (!rawDate) return false;
      const dt = new Date(rawDate);
      let localDateStr = '';
      if (!isNaN(dt.getTime())) {
        const dy = dt.getFullYear();
        const dm = (dt.getMonth() + 1).toString().padStart(2, '0');
        const dd = dt.getDate().toString().padStart(2, '0');
        localDateStr = `${dy}-${dm}-${dd}`;
      }
      const sliceStr = String(rawDate).slice(0, 10);
      return localDateStr === dateStr || sliceStr === dateStr;
    });

    const activeReq = dateRequests.find((r: any) => {
      const s = String(r.status || r.Status || '').toLowerCase().trim();
      return s === 'pending' || s === 'approved';
    });

    if (activeReq) {
      this.canSubmit = false;
      const st = String(activeReq.status || activeReq.Status || 'Pending');
      this.currentStatus = st.charAt(0).toUpperCase() + st.slice(1).toLowerCase();
      this.statusMessage = this.currentStatus === 'Approved'
        ? 'Attendance for this date is already approved and regularized.'
        : 'A regularization request for this date is currently pending approval.';
    } else {
      const rejectedReq = dateRequests.find((r: any) => {
        const s = String(r.status || r.Status || '').toLowerCase().trim();
        return s === 'rejected';
      });

      if (rejectedReq) {
        this.canSubmit = true;
        this.currentStatus = 'Rejected';
        this.rejectionReason = rejectedReq.rejectionReason || rejectedReq.RejectionReason || '';
      } else if (this.data?.canRegularize === false || 
                 this.data?.regularizationStatus === 'Pending' || 
                 this.data?.regularizationStatus === 'Approved') {
        this.canSubmit = false;
        this.currentStatus = this.data?.regularizationStatus || 'Pending';
        this.statusMessage = this.currentStatus === 'Approved'
          ? 'Attendance for this date is already approved and regularized.'
          : 'A regularization request for this date is currently pending approval.';
      } else {
        this.canSubmit = true;
        this.currentStatus = this.data?.regularizationStatus || '';
        this.rejectionReason = this.data?.rejectionReason || '';
      }
    }
  }

  private parseInputDate(data: any): Date {
    if (!data) return new Date();

    // 1. Direct Date object
    if (data.dateObj instanceof Date && !isNaN(data.dateObj.getTime())) {
      return data.dateObj;
    }
    if (data.date instanceof Date && !isNaN(data.date.getTime())) {
      return data.date;
    }

    // 2. ISO / YYYY-MM-DD string
    const rawStr = data.dateStr || data.date || data.Date;
    if (typeof rawStr === 'string' && rawStr.trim()) {
      const cleanStr = rawStr.trim();

      // Standard ISO or YYYY-MM-DD parse
      const direct = new Date(cleanStr);
      if (!isNaN(direct.getTime()) && !cleanStr.includes(',')) {
        return direct;
      }

      // Handle strings like "7 sept, fri", "07 Sep, Mon", "7 September, Friday", etc.
      // Remove weekday names and trailing commas
      const noWeekday = cleanStr
        .replace(/(,\s*)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*/gi, '')
        .replace(/^[,\s]+|[,\s]+$/g, '');

      const currentYear = new Date().getFullYear();

      // Try appending current year if not present
      const withYear = new Date(`${noWeekday} ${currentYear}`);
      if (!isNaN(withYear.getTime())) {
        return withYear;
      }

      // Regex matching: (day: 1-31) (month: Jan-Dec/January-December)
      const match = cleanStr.match(/(\d{1,2})\s+([a-zA-Z]+)/);
      if (match) {
        const day = parseInt(match[1], 10);
        const monthStr = match[2].toLowerCase().slice(0, 3);
        const monthMap: { [key: string]: number } = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        if (monthMap[monthStr] !== undefined) {
          return new Date(currentYear, monthMap[monthStr], day, 12, 0, 0);
        }
      }
    }

    return new Date();
  }

  addLog() {
    if (this.data) {
      this.logs.push({
        clockIn: this.data.clockIn,
        clockOut: this.data.clockOut,
      })
    }
    // this.logs.push({ inTime: '', outTime: '' });
  }
  removeLog(index: number) {
    this.logs.splice(index);
  }


  // submitdata() {
  //   if (this.attendaseform.valid) {
  //     console.log('Form Data:', this.attendaseform.value);
  //     this.services.creatRegular(this.attendaseform.value).subscribe(() => {
  //       console.log("successfully add")
  //       this.dialogref.close(true);
  //     })

  //   }
  // }
 
  combine(date: Date, time: string): string {
    const [h, m] = (time || '00:00').split(':').map(Number);
    const y = date.getFullYear();
    const mon = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = (h || 0).toString().padStart(2, '0');
    const mins = (m || 0).toString().padStart(2, '0');
    return `${y}-${mon}-${day}T${hours}:${mins}:00`;
  }

  formatDateOnly(date: Date): string {
    const y = date.getFullYear();
    const mon = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${y}-${mon}-${day}T12:00:00`;
  }

  submitdata(): void {
    if (!this.canSubmit) {
      this.toaster.warning('Regularization is already submitted for this date.');
      return;
    }

    if (!this.attendaseform.valid) {
      this.toaster.warning('Please fill all required fields');
      return;
    }

    const { selectedDate, clockIn, clockOut, Reason } = this.attendaseform.getRawValue();

    if (!selectedDate || !clockIn || !clockOut || !Reason) {
      this.toaster.warning('All fields are required');
      return;
    }

    const loggedUser = (typeof localStorage !== 'undefined' ? (localStorage.getItem('employeeId') || localStorage.getItem('userId')) : null)
      || (typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('employeeId') || sessionStorage.getItem('userId')) : null);
    const employeeId = this.data?.employeeId ? Number(this.data.employeeId) : (loggedUser ? Number(loggedUser) : null);

    const payload = {
      EmployeeId: employeeId,
      RequestType: 'Regularization',
      Reason,
      RequestedDate: this.formatDateOnly(selectedDate),
      clockIn: this.combine(selectedDate, clockIn),
      clockOut: this.combine(selectedDate, clockOut),
    };

    this.services.creatRegular(payload).subscribe({
      next: () => {
        this.toaster.success('Regularization request submitted');
        this.dialogref.close(true);
      },
      error: (err) => {
        console.error('API error:', err);
        const msg = err?.error?.message || err?.error?.Message || 'Submission failed';
        this.toaster.error(msg, 'Error');
      }
    });
  }

  closeDialog() {
    this.dialogref.close();
  }
}
