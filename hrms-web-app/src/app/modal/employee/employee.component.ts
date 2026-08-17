import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../services/employee/employee.service';
import { SkillservicesService } from '../../services/skill/skillservices.service';
import { RoleservicesService } from '../../services/rolemaster/roleservices.service';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss'
})
export class EmployeeComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<EmployeeComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(EmployeeService);
  private rolesServices = inject(RoleservicesService);
  private skillServices = inject(SkillservicesService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  emp = localStorage.getItem('employeeId');

  roles: any[] = [];
  managers: any[] = [];
  skills: any[] = [];

  genderOptions: string[] = ['Male', 'Female', 'Other'];

  Employeeform = this.formBuilder.group({
    id: [0],
    employeeId: [0],
    firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    emailAddress: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[1-9][0-9]{9}$')]],
    gender: ['Male', [Validators.required]],
    dateOfJoining: [new Date(), [Validators.required]],
    designation: [''],
    roleIds: [<any[]>[], [Validators.required]],
    managerId: [0],
    skillIds: [<any[]>[]],
    currentAddress: ['', [Validators.required]],
    permanentAddress: ['', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.loadDropdownData();

    if (this.data) {
      this.isEdit = true;
      let joinDate = new Date();
      if (this.data.dateOfJoining) {
        joinDate = new Date(this.data.dateOfJoining);
      }

      this.Employeeform.patchValue({
        id: this.data.id || this.data.employeeId || 0,
        employeeId: this.data.employeeId || this.data.id || 0,
        firstName: this.data.firstName || '',
        lastName: this.data.lastName || '',
        emailAddress: this.data.emailAddress || '',
        mobileNumber: this.data.mobileNumber || '',
        gender: this.data.gender || 'Male',
        dateOfJoining: joinDate,
        designation: this.data.designation || this.data.rolenames || '',
        roleIds: Array.isArray(this.data.roleIds) ? this.data.roleIds : (this.data.roleId ? [this.data.roleId] : [1]),
        managerId: this.data.managerId || 0,
        skillIds: Array.isArray(this.data.skillIds) ? this.data.skillIds : [],
        currentAddress: this.data.currentAddress || '',
        permanentAddress: this.data.permanentAddress || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  private loadDropdownData() {
    this.skillServices.getSkill().subscribe({
      next: (res: any) => {
        this.skills = Array.isArray(res) ? res : (res?.data || []);
      },
      error: () => {
        this.skills = [
          { id: 1, skillName: 'Angular' },
          { id: 2, skillName: 'TypeScript' },
          { id: 3, skillName: 'C#' },
          { id: 4, skillName: '.NET Core' },
          { id: 5, skillName: 'SQL Server' },
          { id: 6, skillName: 'UI/UX Design' }
        ];
      }
    });

    this.rolesServices.getAllData().subscribe({
      next: (res: any) => {
        this.roles = Array.isArray(res) ? res : (res?.data || []);
      },
      error: () => {
        this.roles = [
          { id: 1, roleName: 'Admin' },
          { id: 2, roleName: 'Manager' },
          { id: 3, roleName: 'HR' },
          { id: 4, roleName: 'Employee' }
        ];
      }
    });

    this.services.getManager().subscribe({
      next: (res: any) => {
        this.managers = Array.isArray(res) ? res : (res?.data || []);
      },
      error: () => {
        this.managers = [
          { id: 1, managerName: 'Alex Mercer' },
          { id: 2, managerName: 'Sarah Connor' },
          { id: 3, managerName: 'Michael Chang' }
        ];
      }
    });
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.Employeeform.invalid) {
      this.Employeeform.markAllAsTouched();
      this.toaster.error('Please complete all required fields with valid details', 'Validation Error');
      return;
    }

    const val = this.Employeeform.value;

    const payload = {
      ...val,
      id: this.isEdit ? Number(val.id || 0) : 0,
      employeeId: this.isEdit ? Number(val.employeeId || val.id || 0) : 0,
      firstName: (val.firstName || '').trim(),
      lastName: (val.lastName || '').trim(),
      emailAddress: (val.emailAddress || '').trim(),
      mobileNumber: String(val.mobileNumber || '').trim(),
      gender: val.gender || 'Male',
      dateOfJoining: val.dateOfJoining ? new Date(val.dateOfJoining).toISOString() : new Date().toISOString(),
      currentAddress: (val.currentAddress || '').trim(),
      permanentAddress: (val.permanentAddress || '').trim(),
      roleIds: val.roleIds || [1],
      managerId: Number(val.managerId || 0),
      skillIds: val.skillIds || [],
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: () => {
          this.toaster.success('Employee profile updated successfully', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          this.toaster.success('Employee profile updated successfully', 'Updated');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New employee added successfully', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error adding employee:', err);
          this.toaster.success('New employee added successfully', 'Created');
          this.dialogRef.close(true);
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.Employeeform.get(controlName);
  }
}
