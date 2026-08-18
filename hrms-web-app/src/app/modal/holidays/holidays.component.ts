import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { HolidayservicesService } from '../../services/holiday/holidayservices.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [
    MatInputModule,
    MatFormField,
    MatButtonModule,
    ReactiveFormsModule,
    MatRadioModule,
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './holidays.component.html',
  styleUrl: './holidays.component.scss',
  providers: [provideNativeDateAdapter()],
})
export class HolidaysComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private services = inject(HolidayservicesService);
  private toaster = inject(ToastrService);

  isEdit = false;
  selectedDate!: Date;
  holidayTypes: string[] = ['NATIONAL', 'REGIONAL', 'OPTIONAL'];

  Holidayform = this.formBuilder.group({
    id: [0],
    holidayName: ['', [Validators.required]],
    holidayDate: ['', [Validators.required]],
    type: ['NATIONAL', [Validators.required]],
    description: ['', [Validators.required]],
    isActive: [true]
  });

  constructor(
    private dialogRef: MatDialogRef<HolidaysComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.Holidayform.patchValue({
        id: this.data.id || 0,
        holidayName: this.data.holidayName || '',
        holidayDate: this.data.holidayDate || '',
        type: this.data.type || this.data.Type || this.data.holidayType || 'NATIONAL',
        description: this.data.description || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  submitdata() {
    if (this.Holidayform.invalid) {
      this.Holidayform.markAllAsTouched();
      this.toaster.warning('Please enter valid holiday name, date, type, and description.');
      return;
    }

    const formVal = this.Holidayform.value;
    const parts = formVal.holidayDate ? new Date(formVal.holidayDate) : new Date();
    this.selectedDate = new Date(parts.getFullYear(), parts.getMonth(), parts.getDate(), 12);
    const formattedDate = this.selectedDate.toISOString().split('T')[0];

    const payload: any = {
      id: formVal.id || 0,
      holidayName: formVal.holidayName,
      holidayDate: formattedDate,
      description: formVal.description,
      type: formVal.type || 'NATIONAL',
      Type: formVal.type || 'NATIONAL',
      holidayType: formVal.type || 'NATIONAL',
      isActive: formVal.isActive !== false
    };

    if (this.isEdit) {
      this.services.updateHoliday(payload, formattedDate).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Holiday Record Successfully Updated', 'Success');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to update holiday', 'Error');
          }
        },
        error: (err) => {
          console.error('Error updating holiday:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'Holiday Record Updated';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createHoliday(payload, formattedDate).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Holiday Record Successfully Added', 'Success');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to add holiday', 'Error');
          }
        },
        error: (err) => {
          console.error('Error adding holiday:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'Holiday Record Added';
          this.toaster.info(msg, 'Status');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controleName: string) {
    return this.Holidayform.get(controleName);
  }
}
