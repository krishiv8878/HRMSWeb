import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectsService } from '../../services/project/projects.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { RbacService } from '../../core/rbac.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatSelectModule } from '@angular/material/select';
import { getNames } from 'country-list';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss'
})
export class ProjectComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(ProjectsService);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;
  id!: any;
  countries: string[] = [];
  managersList: { id: number; name: string }[] = [];

  statusOptions = ['In Progress', 'Completed', 'On Hold', 'Planned'];

  projectForm = this.formBuilder.group({
    id: [0],
    projectName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    clientName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-_/&]+$')]],
    clientRegion: ['United States', [Validators.required]],
    projectManagerId: [null as number | null],
    startDate: [''],
    endDate: [''],
    description: ['', [Validators.required]],
    teamSize: [0],
    status: ['In Progress', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.countries = getNames();

    // Pre-populate managers list immediately if passed from parent
    if (this.data?.managersList && Array.isArray(this.data.managersList) && this.data.managersList.length > 0) {
      this.managersList = [...this.data.managersList];
    } else if (this.data?.employeesList && Array.isArray(this.data.employeesList) && this.data.employeesList.length > 0) {
      this.populateManagersFromList(this.data.employeesList);
    }

    this.loadManagers();

    const hasValidId = !!(this.data && (this.data.id || this.data.projectMasterId) && Number(this.data.id || this.data.projectMasterId) > 0);
    if (hasValidId) {
      this.isEdit = true;
      this.id = Number(this.data.id || this.data.projectMasterId);
      const rawMgr = this.data.projectManagerId
        ?? this.data.managerId
        ?? this.data.rawRecord?.projectManagerId
        ?? this.data.rawRecord?.ProjectManagerId
        ?? this.data.rawRecord?.managerId
        ?? this.data.rawRecord?.ManagerId;
      const existingMgrId = (rawMgr !== null && rawMgr !== undefined && rawMgr !== '' && !isNaN(Number(rawMgr)) && Number(rawMgr) > 0)
        ? Number(rawMgr)
        : null;

      if (existingMgrId) {
        this.ensureCurrentManagerInList(existingMgrId);
      }

      this.projectForm.patchValue({
        id: this.id,
        projectName: this.data.projectName || '',
        clientName: this.data.clientName || '',
        clientRegion: this.data.clientRegion || 'United States',
        projectManagerId: existingMgrId,
        startDate: this.formatDateForInput(this.data.startDate || this.data.rawRecord?.startDate),
        endDate: this.formatDateForInput(this.data.endDate || this.data.rawRecord?.endDate),
        description: this.data.description || '',
        teamSize: Number(this.data.teamSize || 0),
        status: this.data.status || 'In Progress',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    } else {
      this.isEdit = false;
      this.id = null;
      this.projectForm.patchValue({
        id: 0,
        projectName: '',
        clientName: '',
        clientRegion: 'United States',
        projectManagerId: null,
        startDate: '',
        endDate: '',
        description: '',
        teamSize: 0,
        status: 'In Progress',
        isActive: true
      });
      this.applyDefaultManager();
    }
  }

  private populateManagersFromList(list: any[]) {
    this.managersList = list.map((e: any) => ({
      id: Number(e.id || e.employeeId),
      name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.fullName || `Employee #${e.id}`
    }));
    this.syncSelectedManager();
  }

  loadManagers() {
    this.employeeService.getManager().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (raw.length > 0) {
          this.managersList = raw.map((m: any) => ({
            id: Number(m.id || m.Id || m.employeeId),
            name: m.managerName || m.ManagerName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || `Manager #${m.id}`
          }));
          this.syncSelectedManager();
        } else if (!this.managersList || this.managersList.length === 0) {
          this.fallbackLoadManagers();
        }
      },
      error: () => {
        if (!this.managersList || this.managersList.length === 0) {
          this.fallbackLoadManagers();
        }
      }
    });
  }

  fallbackLoadManagers() {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (raw.length > 0) {
          this.populateManagersFromList(raw);
        }
      }
    });
  }

  private ensureCurrentManagerInList(mgrId: number) {
    if (!mgrId || this.managersList.some(m => Number(m.id) === Number(mgrId))) return;
    const initialName = this.data?.managerName || this.data?.rawRecord?.managerName || `Manager #${mgrId}`;
    this.managersList.unshift({ id: Number(mgrId), name: initialName });
    this.employeeService.getEmployeeById(mgrId).subscribe({
      next: (res: any) => {
        const emp = res?.data || res;
        if (emp) {
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.fullName;
          if (fullName) {
            const item = this.managersList.find(m => Number(m.id) === Number(mgrId));
            if (item) item.name = fullName;
          }
        }
      }
    });
  }

  syncSelectedManager() {
    if (this.projectForm.get('projectManagerId')?.dirty) {
      return;
    }

    const currentVal: any = this.projectForm.value.projectManagerId;
    const rawMgr: any = (currentVal !== null && currentVal !== undefined && currentVal !== '' && !isNaN(Number(currentVal)) && Number(currentVal) > 0)
      ? Number(currentVal)
      : (this.data?.projectManagerId
        ?? this.data?.managerId
        ?? this.data?.rawRecord?.projectManagerId
        ?? this.data?.rawRecord?.ProjectManagerId
        ?? this.data?.rawRecord?.managerId
        ?? this.data?.rawRecord?.ManagerId);

    if (rawMgr !== null && rawMgr !== undefined && String(rawMgr).trim() !== '' && !isNaN(Number(rawMgr)) && Number(rawMgr) > 0) {
      const mgrId = Number(rawMgr);
      this.ensureCurrentManagerInList(mgrId);
      this.projectForm.patchValue({ projectManagerId: mgrId });
    } else {
      this.applyDefaultManager();
    }
  }

  private getStorageItem(key: string): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || '';
    }
    return '';
  }

  applyDefaultManager() {
    const currentEmpId = Number(this.getStorageItem('employeeId')) || 0;
    if (!this.isEdit && currentEmpId > 0 && !this.projectForm.value.projectManagerId) {
      if (this.rbacService.isManager()) {
        this.projectForm.patchValue({ projectManagerId: currentEmpId });
      }
    }
  }

  onManagerChange(event?: any) {
    // Handled natively by Angular Reactive Forms
  }

  private formatDateForInput(dateVal: any): string {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch {}
    return '';
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z0-9 .,\-_/&]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.toaster.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    const val = this.projectForm.value;
    const trimmedName = (val.projectName || '').trim();

    // Duplicate project name check
    const existingProjects: any[] = this.data?.existingProjects || [];
    const isDuplicate = existingProjects.some((p: any) => {
      const matchName = String(p.projectName || '').toLowerCase().trim() === trimmedName.toLowerCase();
      const currentId = Number(this.isEdit ? (val.id || this.id || 0) : 0);
      const matchId = Number(p.id) === currentId && currentId > 0;
      return matchName && !matchId;
    });

    if (isDuplicate) {
      this.toaster.error(`A project named '${trimmedName}' already exists.`, 'Duplicate Project');
      return;
    }

    // Date range validation
    if (val.startDate && val.endDate) {
      const start = new Date(val.startDate).getTime();
      const end = new Date(val.endDate).getTime();
      if (start > end) {
        this.toaster.error('Project end date cannot be earlier than start date.', 'Date Range Error');
        return;
      }
    }

    const currentEmpId = Number(this.getStorageItem('employeeId')) || 0;
    const rawVal: any = this.projectForm.value.projectManagerId;
    let managerIdVal: number | null = null;
    if (rawVal !== null && rawVal !== undefined && rawVal !== '' && rawVal !== 'null') {
      const parsed = Number(rawVal);
      if (!isNaN(parsed) && parsed > 0) {
        managerIdVal = parsed;
      }
    } else if (!this.isEdit && this.rbacService.isManager() && currentEmpId > 0) {
      managerIdVal = currentEmpId;
    }

    const payload = {
      id: this.isEdit ? Number(val.id || this.id || 0) : 0,
      projectMasterId: this.isEdit ? Number(val.id || this.id || 0) : 0,
      projectName: trimmedName,
      clientName: (val.clientName || '').trim(),
      clientRegion: val.clientRegion || 'Global',
      description: (val.description || '').trim(),
      projectManagerId: managerIdVal,
      managerId: managerIdVal,
      ProjectManagerId: managerIdVal,
      ManagerId: managerIdVal,
      startDate: val.startDate ? new Date(val.startDate).toISOString() : null,
      endDate: val.endDate ? new Date(val.endDate).toISOString() : null,
      teamSize: Number(val.teamSize || 0),
      status: val.status || 'In Progress',
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateData(payload, payload.id).subscribe({
        next: () => {
          this.toaster.success('Project details successfully updated', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating project:', err);
          this.toaster.error(err?.error?.message || err?.error || 'Failed to update project details', 'Update Failed');
        }
      });
    } else {
      this.services.createData(payload).subscribe({
        next: () => {
          this.toaster.success('New client project successfully created', 'Created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating project:', err);
          this.toaster.error(err?.error?.message || err?.error || 'Failed to create project', 'Creation Failed');
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.projectForm.get(controlName);
  }
}
