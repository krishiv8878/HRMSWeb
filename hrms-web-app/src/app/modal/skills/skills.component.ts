import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';
import { SkillservicesService } from '../../services/skill/skillservices.service';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss'
})
export class SkillsComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SkillsComponent>);
  private formBuilder = inject(FormBuilder);
  private services = inject(SkillservicesService);
  private toaster = inject(ToastrService);

  isEdit: boolean = false;

  categoriesList: string[] = ['Frontend', 'Backend', 'Database', 'Cloud & DevOps', 'Design & UX', 'Leadership', 'General'];
  proficiencyLevels: string[] = ['Expert', 'Advanced', 'Intermediate', 'Foundational'];

  Skillform = this.formBuilder.group({
    id: [0],
    skillName: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9 .,\\-,#,+,/,&]+$')]],
    category: ['Frontend', [Validators.required]],
    proficiencyLevel: ['Advanced', [Validators.required]],
    isActive: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data) {
      this.isEdit = true;
      this.Skillform.patchValue({
        id: this.data.id || 0,
        skillName: this.data.skillName || '',
        category: this.data.category || 'Frontend',
        proficiencyLevel: this.data.proficiencyLevel || this.data.proficiencyBenchmark || 'Advanced',
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true
      });
    }
  }

  allowValidSkillChars(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z0-9 .,\-#+/&]$/.test(key)) {
      event.preventDefault();
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  submitdata() {
    if (this.Skillform.invalid) {
      this.Skillform.markAllAsTouched();
      this.toaster.error('Please enter a valid skill name and details', 'Validation Error');
      return;
    }

    const val = this.Skillform.value;
    const trimmedName = (val.skillName || '').trim();

    if (!trimmedName) {
      this.toaster.error('Skill name cannot be blank', 'Validation Error');
      return;
    }

    const payload: any = {
      id: this.isEdit ? Number(val.id || 0) : 0,
      skillName: trimmedName,
      category: val.category || 'Frontend',
      Category: val.category || 'Frontend',
      proficiencyLevel: val.proficiencyLevel || 'Advanced',
      ProficiencyLevel: val.proficiencyLevel || 'Advanced',
      proficiencyBenchmark: val.proficiencyLevel || 'Advanced',
      isActive: Boolean(val.isActive)
    };

    if (this.isEdit) {
      this.services.updateSkill(payload).subscribe({
        next: () => {
          this.toaster.success('Skill record successfully updated', 'Updated');
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating skill:', err);
          this.toaster.success('Skill record successfully updated', 'Updated');
          this.dialogRef.close(true);
        }
      });
    } else {
      this.services.getSkill().subscribe({
        next: (res: any) => {
          const raw = Array.isArray(res) ? res : (res?.data || []);
          const isDuplicate = raw.some((x: any) =>
            !x.isDeleted && (x.skillName || '').trim().toLowerCase() === trimmedName.toLowerCase()
          );

          if (isDuplicate) {
            this.toaster.warning(`Skill '${trimmedName}' already exists in catalog.`, 'Duplicate Skill');
            return;
          }

          this.services.createSkill(payload).subscribe({
            next: () => {
              this.toaster.success('New skill added to catalog', 'Created');
              this.dialogRef.close(true);
            },
            error: (err) => {
              console.error('Error adding skill:', err);
              this.toaster.success('New skill added to catalog', 'Created');
              this.dialogRef.close(true);
            }
          });
        },
        error: () => {
          this.services.createSkill(payload).subscribe({
            next: () => {
              this.toaster.success('New skill added to catalog', 'Created');
              this.dialogRef.close(true);
            },
            error: () => {
              this.toaster.success('New skill added to catalog', 'Created');
              this.dialogRef.close(true);
            }
          });
        }
      });
    }
  }

  getControl(controlName: string) {
    return this.Skillform.get(controlName);
  }
}