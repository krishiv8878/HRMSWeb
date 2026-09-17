import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProjectsService } from '../../services/project/projects.service';

export interface TaskModalData {
  id?: number;
  entryDate: string;
  projectId?: number;
  projectName?: string;
  taskDescription?: string;
  hours?: number;
}

@Component({
  selector: 'app-timesheet-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './timesheet-task-modal.component.html',
  styleUrl: './timesheet-task-modal.component.scss'
})
export class TimesheetTaskModalComponent implements OnInit {
  taskForm!: FormGroup;
  projects: any[] = [];
  isLoadingProjects: boolean = false;
  isEditMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    public dialogRef: MatDialogRef<TimesheetTaskModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskModalData
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.id && this.data.id > 0;
    this.taskForm = this.fb.group({
      projectId: [this.data?.projectId || '', [Validators.required]],
      taskDescription: [this.data?.taskDescription || '', [Validators.required, Validators.maxLength(500)]],
      hours: [this.data?.hours || 1, [Validators.required, Validators.min(0.25), Validators.max(24)]]
    });

    this.loadProjects();
  }

  getProjectDisplayName(): string {
    if (this.data?.projectName) {
      return this.data.projectName;
    }
    const currentId = this.taskForm?.get('projectId')?.value;
    if (currentId && this.projects.length > 0) {
      const match = this.projects.find(p => Number(p.id || p.projectMasterId) === Number(currentId));
      if (match) return match.projectName || match.name;
    }
    return 'Assigned Project';
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    this.projectsService.getAllData().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.projects = res;
        } else if (res && Array.isArray(res.data)) {
          this.projects = res.data;
        } else {
          this.projects = [];
        }
        this.isLoadingProjects = false;
      },
      error: () => {
        this.projects = [];
        this.isLoadingProjects = false;
      }
    });
  }

  save(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const val = this.taskForm.value;
    this.dialogRef.close({
      id: this.data?.id || 0,
      projectId: Number(val.projectId),
      entryDate: this.data.entryDate,
      taskDescription: val.taskDescription.trim(),
      hours: Number(val.hours)
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
