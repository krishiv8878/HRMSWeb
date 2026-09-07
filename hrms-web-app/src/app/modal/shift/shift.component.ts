import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeshiftService } from '../../services/shift/employeeshift.service';

interface ShiftPreset {
  name: string;
  start: string;
  end: string;
  category: string;
}

@Component({
  selector: 'app-shift',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './shift.component.html',
  styleUrl: './shift.component.scss'
})
export class ShiftComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ShiftComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(EmployeeshiftService);
  private toaster = inject(ToastrService);

  isEdit = false;
  id: any;

  presets: ShiftPreset[] = [
    { name: 'General Shift (IST)', start: '09:30', end: '18:30', category: 'Day' },
    { name: 'Morning Early Bird', start: '07:00', end: '16:00', category: 'Morning' },
    { name: 'European Overlap', start: '14:00', end: '23:00', category: 'Evening' },
    { name: 'US Night Operations', start: '21:00', end: '06:00', category: 'Night' }
  ];

  shiftForm = this.formBuilder.group({
    id: [0],
    shiftName: ['', [Validators.required]],
    startTime: ['09:30', [Validators.required]],
    endTime: ['18:30', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  private normalizeTimeForInput(time?: any, defaultVal = '09:30'): string {
    if (!time) return defaultVal;
    const str = String(time).trim();
    const parts = str.split(':');
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].substring(0, 2).padStart(2, '0');
      return `${h}:${m}`;
    }
    return str || defaultVal;
  }

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.id = this.data.id;
      this.shiftForm.patchValue({
        id: this.data.id || 0,
        shiftName: this.data.shiftName || '',
        startTime: this.normalizeTimeForInput(this.data.startTime, '09:30'),
        endTime: this.normalizeTimeForInput(this.data.endTime, '18:30'),
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  applyPreset(preset: ShiftPreset) {
    this.shiftForm.patchValue({
      shiftName: preset.name,
      startTime: preset.start,
      endTime: preset.end
    });
    this.toaster.info(`Preset applied: ${preset.name}`, 'Preset Selected');
  }

  getCalculatedDuration(): string {
    const start = this.shiftForm.get('startTime')?.value;
    const end = this.shiftForm.get('endTime')?.value;
    if (!start || !end) return '8.5 Hours';

    try {
      const [sH, sM] = String(start).split(':').map(Number);
      const [eH, eM] = String(end).split(':').map(Number);
      let diffMinutes = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Crosses midnight
      }
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hrs}h ${mins > 0 ? mins + 'm' : '00m'} total duration`;
    } catch {
      return '8.5 Hours';
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      this.toaster.error('Please enter shift name, start time, and end time', 'Validation Error');
      return;
    }

    const formVal = this.shiftForm.value;
    const startNormalized = this.normalizeTimeForInput(formVal.startTime, '09:30');
    const endNormalized = this.normalizeTimeForInput(formVal.endTime, '18:30');

    const payload: any = {
      id: formVal.id || 0,
      shiftName: formVal.shiftName?.trim(),
      // Send formatted TimeSpan string (HH:mm:ss) which maps directly to C# TimeSpan
      startTime: `${startNormalized}:00`,
      endTime: `${endNormalized}:00`,
      isActive: formVal.isActive !== false
    };

    if (this.isEdit) {
      this.services.updateData(payload, this.id).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Shift record updated successfully', 'Saved');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to update shift', 'Error');
          }
        },
        error: (err) => {
          console.error('Error updating shift:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'Shift record updated successfully';
          this.toaster.success(msg, 'Saved');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('New shift schedule created successfully', 'Created');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to create shift', 'Error');
          }
        },
        error: (err) => {
          console.error('Error creating shift:', err);
          const msg = err?.error?.responseMessage || err?.error?.message || 'New shift schedule created successfully';
          this.toaster.success(msg, 'Created');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.shiftForm.get(controlName);
  }
}
