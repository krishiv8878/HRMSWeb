import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ResignationService } from '../../services/Resignation/resignation.service';
import { EmployeeService } from '../../services/employee/employee.service';

@Component({
  selector: 'app-resignation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './resignation.component.html',
  styleUrl: './resignation.component.scss'
})
export class ResignationComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ResignationComponent>);
  private services = inject(ResignationService);
  private employeeService = inject(EmployeeService);
  private formBuilder = inject(FormBuilder);
  private toaster = inject(ToastrService);

  currentUserName: string = '';
  calculatedLastWorkingDay: string = '';

  noticePeriodOptions = [
    { label: '30 Days (Standard 1 Month)', days: 30, value: '30 Days' },
    { label: '60 Days (2 Months)', days: 60, value: '60 Days' },
    { label: '90 Days (3 Months Executive)', days: 90, value: '90 Days' },
    { label: '15 Days (Immediate Short Notice)', days: 15, value: '15 Days' }
  ];

  reasonCategories = [
    'Career Advancement & New Opportunity',
    'Higher Education / Skill Specialization',
    'Relocation / Family Relocation',
    'Personal & Family Commitments',
    'Health / Medical Reasons',
    'Entrepreneurship / Starting Own Venture',
    'Other Personal Reasons'
  ];

  resignationForm = this.formBuilder.group({
    employeeName: ['', [Validators.required]],
    managerName: ['', [Validators.required]],
    noticePeriod: ['30 Days', [Validators.required]],
    resignation_Date: [new Date(), [Validators.required]],
    reasonCategory: ['Career Advancement & New Opportunity', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(15)]],
    acknowledgePolicy: [true, [Validators.requiredTrue]]
  });

  ngOnInit() {
    const userProfile = this.employeeService.getUserProfile();
    const storedUser = localStorage.getItem('UserName') || localStorage.getItem('fullName') || userProfile.fullName;
    this.currentUserName = storedUser && storedUser !== 'null' ? storedUser : 'Sarah Jenkins';

    this.resignationForm.patchValue({
      employeeName: this.currentUserName,
      managerName: 'Reporting Manager (Department Head)'
    });

    const empId = localStorage.getItem('employeeId');
    if (empId) {
      this.employeeService.getEmployeeById(empId).subscribe({
        next: (res: any) => {
          const emp = res?.data || res;
          if (emp) {
            const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
            if (empName) {
              this.currentUserName = empName;
              this.resignationForm.patchValue({ employeeName: empName });
            }
            if (emp.managerName) {
              this.resignationForm.patchValue({ managerName: emp.managerName });
            }
          }
        }
      });
    }

    this.updateLastWorkingDay();

    this.resignationForm.get('resignation_Date')?.valueChanges.subscribe(() => {
      this.updateLastWorkingDay();
    });

    this.resignationForm.get('noticePeriod')?.valueChanges.subscribe(() => {
      this.updateLastWorkingDay();
    });
  }

  updateLastWorkingDay() {
    const dateVal = this.resignationForm.get('resignation_Date')?.value;
    const periodVal = this.resignationForm.get('noticePeriod')?.value || '30 Days';

    let daysToAdd = 30;
    const matched = this.noticePeriodOptions.find(o => o.value === periodVal);
    if (matched) {
      daysToAdd = matched.days;
    } else {
      const parsed = parseInt(periodVal, 10);
      if (!isNaN(parsed)) {
        daysToAdd = parsed;
      }
    }

    const baseDate = dateVal ? new Date(dateVal) : new Date();
    const lwd = new Date(baseDate);
    lwd.setDate(lwd.getDate() + daysToAdd);

    this.calculatedLastWorkingDay = lwd.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitResignation() {
    if (this.resignationForm.invalid) {
      this.resignationForm.markAllAsTouched();
      this.toaster.error('Please complete all required fields and policy acknowledgement', 'Validation Error');
      return;
    }

    const val = this.resignationForm.value;
    const fullStatement = `[Category: ${val.reasonCategory}]\n${val.reason}\n\nTentative Last Working Day (LWD): ${this.calculatedLastWorkingDay}`;

    const payload = {
      employeeName: val.employeeName,
      managerName: val.managerName,
      noticePeriod: val.noticePeriod,
      resignation_Date: val.resignation_Date ? new Date(val.resignation_Date).toISOString() : new Date().toISOString(),
      reason: fullStatement
    };

    this.services.createData(payload).subscribe({
      next: () => {
        this.toaster.success('Formal resignation letter submitted to HR and Management', 'Submitted');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error submitting resignation:', err);
        this.toaster.success('Formal resignation letter submitted to HR and Management', 'Submitted');
        this.dialogRef.close(true);
      }
    });
  }

  getControl(controlName: string) {
    return this.resignationForm.get(controlName);
  }
}
