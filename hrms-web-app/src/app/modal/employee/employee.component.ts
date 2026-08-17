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
import { DesignationservicesService } from '../../services/designation/designationservices.service';

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
  private designationServices = inject(DesignationservicesService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  emp = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;

  roles: any[] = [];
  managers: any[] = [];
  skills: any[] = [];
  designations: any[] = [];

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
    designationId: [1, [Validators.required]],
    designation: [''],
    roleIds: [<any[]>[], [Validators.required]],
    managerId: [0],
    skillIds: [<any[]>[]],
    employeeCode: [0],
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
        designationId: this.data.designationId ? Number(this.data.designationId) : 1,
        designation: this.data.designation || this.data.rolenames || '',
        roleIds: Array.isArray(this.data.roleIds) ? this.data.roleIds : (this.data.roleId ? [this.data.roleId] : [1]),
        managerId: this.data.managerId || 0,
        skillIds: Array.isArray(this.data.skillIds) ? this.data.skillIds : [],
        employeeCode: this.data.employeeCode || 0,
        currentAddress: this.data.currentAddress || '',
        permanentAddress: this.data.permanentAddress || '',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  private loadDropdownData() {
    this.designationServices.getData().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.designations = list.map((d: any) => ({
          id: Number(d.id || d.designationId),
          name: d.designationName || d.designation || 'Specialist'
        }));
        if (this.designations.length > 0 && !this.Employeeform.value.designationId) {
          this.Employeeform.patchValue({
            designationId: this.designations[0].id,
            designation: this.designations[0].name
          });
        }
      },
      error: () => {
        this.designations = [
          { id: 1, name: 'Software Engineer' },
          { id: 2, name: 'Senior Developer' },
          { id: 3, name: 'Tech Lead' },
          { id: 4, name: 'HR Executive' },
          { id: 5, name: 'Project Manager' }
        ];
      }
    });

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

  onDesignationSelect(event: any) {
    const selectedId = Number(event.target.value);
    const found = this.designations.find(d => d.id === selectedId);
    if (found) {
      this.Employeeform.patchValue({ designation: found.name });
    }
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

    const clientUrl = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:4200';

    const managerIdVal = (val.managerId && Number(val.managerId) > 0) ? Number(val.managerId) : null;
    const designationIdVal = (val.designationId && Number(val.designationId) > 0)
      ? Number(val.designationId)
      : (this.designations[0]?.id || 1);

    const designationName = (val.designation || this.designations.find(d => d.id === designationIdVal)?.name || 'Software Engineer').trim();

    const rawRoles: any = val.roleIds;
    const roleIdsArray = (Array.isArray(rawRoles) && rawRoles.length > 0)
      ? rawRoles.map((r: any) => Number(r))
      : [1];

    const rawSkills: any = val.skillIds;
    const skillIdsArray = (Array.isArray(rawSkills) && rawSkills.length > 0)
      ? rawSkills.map((s: any) => Number(s))
      : [];

    const payload: any = {
      id: this.isEdit ? Number(val.id || val.employeeId || 0) : 0,
      employeeId: this.isEdit ? Number(val.employeeId || val.id || 0) : 0,
      firstName: (val.firstName || '').trim(),
      lastName: (val.lastName || '').trim(),
      emailAddress: (val.emailAddress || '').trim(),
      primaryEmailAddress: (val.emailAddress || '').trim(),
      mobileNumber: String(val.mobileNumber || '').trim(),
      gender: val.gender || 'Male',
      dateOfJoining: val.dateOfJoining ? new Date(val.dateOfJoining).toISOString() : new Date().toISOString(),
      currentAddress: (val.currentAddress || '').trim(),
      permanentAddress: (val.permanentAddress || val.currentAddress || '').trim(),
      designationId: designationIdVal,
      designation: designationName,
      roleIds: roleIdsArray,
      managerId: managerIdVal,
      skillIds: skillIdsArray,
      employeeCode: Number(val.employeeCode || Math.floor(100000 + Math.random() * 900000)),
      profileCompleted: true,
      clientUrl: clientUrl,
      isActive: Boolean(val.isActive),
      isDeleted: false
    };

    if (this.isEdit) {
      this.services.updateData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('Employee profile updated successfully', 'Updated');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to update employee', 'Update Error');
          }
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          this.toaster.error(err?.error?.responseMessage || 'Error updating employee profile', 'Error');
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: (res: any) => {
          if (res?.responseCode === 200 || res?.success || !res?.responseCode) {
            this.toaster.success('New employee added successfully', 'Created');
            this.dialogRef.close(true);
          } else {
            this.toaster.error(res?.responseMessage || 'Failed to add employee', 'Creation Error');
          }
        },
        error: (err) => {
          console.error('Error adding employee:', err);
          this.toaster.error(err?.error?.responseMessage || 'Error adding new employee', 'Error');
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.Employeeform.get(controlName);
  }
}
