import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { JobRequisitionDto, RecruitmentService, CreateJobRequisitionRequest } from '../../../services/recruitment/recruitment.service';
import { EmployeeService } from '../../../services/employee/employee.service';

@Component({
  selector: 'app-job-requisition-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './job-requisition-modal.component.html',
  styleUrls: ['./job-requisition-modal.component.scss']
})
export class JobRequisitionModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<JobRequisitionModalComponent>);
  public data: { requisition?: JobRequisitionDto } = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isSubmitting = false;
  isEditMode = false;
  employees: any[] = [];

  departments = ['Engineering', 'Product & Design', 'Human Resources', 'Sales & Marketing', 'Finance & Ops', 'Quality Assurance', 'Customer Success'];
  employmentTypes = ['Full-Time', 'Contract', 'Internship', 'Part-Time'];

  reqForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    department: ['Engineering', Validators.required],
    location: ['Headquarters', Validators.required],
    employmentType: ['Full-Time', Validators.required],
    openPositions: [1, [Validators.required, Validators.min(1)]],
    experienceMin: [2, [Validators.required, Validators.min(0)]],
    experienceMax: [5, [Validators.required, Validators.min(0)]],
    budgetMin: [600000, [Validators.required, Validators.min(0)]],
    budgetMax: [1200000, [Validators.required, Validators.min(0)]],
    hiringManagerId: [null],
    recruiterId: [null],
    targetCloseDate: [''],
    description: ['', Validators.required],
    requirements: ['']
  });

  ngOnInit(): void {
    this.isEditMode = !!this.data.requisition;
    this.loadEmployees();

    if (this.isEditMode && this.data.requisition) {
      const r = this.data.requisition;
      this.reqForm.patchValue({
        title: r.title,
        department: r.department,
        location: r.location,
        employmentType: r.employmentType,
        openPositions: r.openPositions,
        experienceMin: r.experienceMin,
        experienceMax: r.experienceMax,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        hiringManagerId: r.hiringManagerId,
        recruiterId: r.recruiterId,
        targetCloseDate: r.targetCloseDate ? r.targetCloseDate.split('T')[0] : '',
        description: r.description,
        requirements: r.requirements
      });
    }
  }

  loadEmployees(): void {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        this.employees = Array.isArray(res) ? res : res?.data || [];
      },
      error: () => {}
    });
  }

  submit(): void {
    if (this.reqForm.invalid) {
      this.reqForm.markAllAsTouched();
      this.toaster.warning('Please complete all required requisition fields', 'Validation');
      return;
    }

    this.isSubmitting = true;
    const req: CreateJobRequisitionRequest = {
      title: this.reqForm.value.title,
      department: this.reqForm.value.department,
      location: this.reqForm.value.location,
      employmentType: this.reqForm.value.employmentType,
      openPositions: Number(this.reqForm.value.openPositions),
      experienceMin: Number(this.reqForm.value.experienceMin),
      experienceMax: Number(this.reqForm.value.experienceMax),
      budgetMin: Number(this.reqForm.value.budgetMin),
      budgetMax: Number(this.reqForm.value.budgetMax),
      hiringManagerId: this.reqForm.value.hiringManagerId ? Number(this.reqForm.value.hiringManagerId) : undefined,
      recruiterId: this.reqForm.value.recruiterId ? Number(this.reqForm.value.recruiterId) : undefined,
      targetCloseDate: this.reqForm.value.targetCloseDate || undefined,
      description: this.reqForm.value.description,
      requirements: this.reqForm.value.requirements
    };

    if (this.isEditMode && this.data.requisition) {
      this.recruitmentService.updateRequisition(this.data.requisition.id, req).subscribe({
        next: () => {
          this.toaster.success('Job requisition updated successfully', 'Success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Failed to update requisition', 'Error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.recruitmentService.createRequisition(req).subscribe({
        next: () => {
          this.toaster.success('Job requisition posted successfully', 'Success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Failed to create requisition', 'Error');
          this.isSubmitting = false;
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
