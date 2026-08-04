import { Component, Inject, inject, Optional, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AssetStatus, AssetType } from '../../interface/asset.interface';

@Component({
  selector: 'app-assetsmasters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDialogClose
  ],
  templateUrl: './assetsmasters.component.html',
  styleUrl: './assetsmasters.component.scss'
})
export class AssetsmastersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private services = inject(AssetsmasterService);
  private toaster = inject(ToastrService);

  isEdit = false;
  assetForm!: FormGroup;

  assetTypes: AssetType[] = ['Laptop', 'Monitor', 'Tablet', 'Furniture', 'Peripherals'];
  statusList: AssetStatus[] = ['Active', 'Available', 'In Repair'];
  locations: string[] = ['NY Office - Floor 4', 'Storage Room B', 'Remote (UK)', 'SF Office - Floor 2', 'NY Office - Desk 42'];
  employees: string[] = ['Unassigned', 'Sarah Jenkins', 'Michael Chang', 'Emma Watson', 'David Miller'];

  constructor(
    @Optional() private dialogRef?: MatDialogRef<AssetsmastersComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.assetForm = this.fb.group({
      modelName: ['', [Validators.required, Validators.minLength(2)]],
      assetType: ['Laptop', [Validators.required]],
      specifications: ['', [Validators.required]],
      location: ['NY Office - Floor 4', [Validators.required]],
      assignedTo: ['Sarah Jenkins', [Validators.required]],
      status: ['Active', [Validators.required]]
    });

    if (this.data) {
      this.isEdit = true;
      this.assetForm.patchValue(this.data);
    }
  }

  submitdata() {
    if (this.assetForm.invalid) {
      this.toaster.warning('Please fill in all required asset details.');
      return;
    }

    const formVal = this.assetForm.value;

    this.services.addAsset({
      modelName: formVal.modelName,
      assetType: formVal.assetType as AssetType,
      specifications: formVal.specifications,
      location: formVal.location,
      assignedTo: formVal.assignedTo,
      status: formVal.status as AssetStatus
    });

    this.toaster.success(
      this.isEdit ? 'Asset record updated successfully' : 'New Asset record added successfully',
      'Success'
    );

    this.dialogRef?.close(true);
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
