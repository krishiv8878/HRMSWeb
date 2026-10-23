import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PmsOneOnOneDto, PmsService } from '../../../services/pms/pms.service';
import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-one-on-one-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './one-on-one-modal.component.html',
  styleUrls: ['./one-on-one-modal.component.scss']
})
export class OneOnOneModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<OneOnOneModalComponent>);
  public data: { oneOnOneDto?: PmsOneOnOneDto } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private pmsService = inject(PmsService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;
  allEmployees: any[] = [];
  currentEmpId: number = 0;

  oneForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    scheduledDate: ['', [Validators.required]],
    agenda: ['', [Validators.required]],
    notes: [''],
    status: ['Scheduled'],
    talkingPoints: this.fb.array([]),
    actionItems: this.fb.array([])
  });

  get talkingPointsArray(): FormArray {
    return this.oneForm.get('talkingPoints') as FormArray;
  }

  get actionItemsArray(): FormArray {
    return this.oneForm.get('actionItems') as FormArray;
  }

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('employeeId') : null;
    this.currentEmpId = stored ? Number(stored) : 0;

    this.employeeService.getLookup().subscribe({
      next: (res: any) => {
        this.allEmployees = (res?.data || res || []).filter((e: any) => !e.isDelete && e.id !== this.currentEmpId);
      },
      error: () => {}
    });

    if (this.data?.oneOnOneDto) {
      this.isEditMode = true;
      const o = this.data.oneOnOneDto.oneOnOne;
      this.oneForm.patchValue({
        employeeId: o.employeeId,
        scheduledDate: o.scheduledDate ? o.scheduledDate.substring(0, 16) : '',
        agenda: o.agenda,
        notes: o.notes || '',
        status: o.status
      });

      if (o.talkingPointsJson) {
        try {
          const points = JSON.parse(o.talkingPointsJson);
          if (Array.isArray(points)) {
            points.forEach(p => this.addTalkingPoint(typeof p === 'string' ? p : p.text));
          }
        } catch (e) {}
      }

      if (o.actionItemsJson) {
        try {
          const items = JSON.parse(o.actionItemsJson);
          if (Array.isArray(items)) {
            items.forEach(it => this.addActionItem(typeof it === 'string' ? it : it.task, Boolean(it.done)));
          }
        } catch (e) {}
      }
    } else {
      // Default initial date: tomorrow 10:00 AM
      const d = new Date(Date.now() + 86400000);
      d.setHours(10, 0, 0, 0);
      this.oneForm.patchValue({
        scheduledDate: d.toISOString().substring(0, 16),
        agenda: 'Bi-Weekly Progress & Career Check-in'
      });
      this.addTalkingPoint('Key wins & milestones accomplished recently');
      this.addTalkingPoint('Current blockers & support required');
      this.addActionItem('Follow up on project deliverable timeline', false);
    }
  }

  addTalkingPoint(text = ''): void {
    this.talkingPointsArray.push(this.fb.control(text, [Validators.required]));
  }

  removeTalkingPoint(index: number): void {
    this.talkingPointsArray.removeAt(index);
  }

  addActionItem(task = '', done = false): void {
    this.actionItemsArray.push(this.fb.group({
      task: [task, [Validators.required]],
      done: [done]
    }));
  }

  removeActionItem(index: number): void {
    this.actionItemsArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.oneForm.invalid) {
      this.oneForm.markAllAsTouched();
      this.toaster.warning('Please complete all required fields');
      return;
    }

    this.isSubmitting = true;
    const val = this.oneForm.value;

    const payload = {
      id: this.data?.oneOnOneDto?.oneOnOne?.id || null,
      employeeId: Number(val.employeeId),
      scheduledDate: new Date(val.scheduledDate).toISOString(),
      agenda: val.agenda,
      notes: val.notes,
      status: val.status,
      talkingPointsJson: JSON.stringify(val.talkingPoints),
      actionItemsJson: JSON.stringify(val.actionItems)
    };

    this.pmsService.saveOneOnOne(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toaster.success('1-on-1 meeting agenda saved successfully!');
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toaster.error(err?.error?.message || 'Failed to save 1-on-1 meeting');
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
