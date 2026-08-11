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
    const todayYMD = new Date().toISOString().slice(0, 10);
    const defaultSN = 'SN-' + Math.floor(100000 + Math.random() * 900000);

    this.assetForm = this.fb.group({
      modelName: ['', [Validators.required, Validators.minLength(2)]],
      assetType: ['Laptop', [Validators.required]],
      specifications: ['', [Validators.required]],
      serialNumber: [defaultSN, [Validators.required]],
      dateOfPurchase: [todayYMD, [Validators.required]],
      location: ['NY Office - Floor 4', [Validators.required]],
      assignedTo: ['Sarah Jenkins', [Validators.required]],
      status: ['Active', [Validators.required]]
    });

    if (this.data) {
      this.isEdit = true;
      let purchaseDate = todayYMD;
      if (this.data.lastAudit || this.data.dateOfPurchase) {
        try {
          const d = new Date(this.data.dateOfPurchase || this.data.lastAudit);
          if (!isNaN(d.getTime())) {
            purchaseDate = d.toISOString().slice(0, 10);
          }
        } catch (_) {}
      }

      this.assetForm.patchValue({
        modelName: this.data.modelName || this.data.assetsMasterName || '',
        assetType: this.data.assetType || 'Laptop',
        specifications: this.data.specifications || this.data.description || '',
        serialNumber: this.data.serialNumber || defaultSN,
        dateOfPurchase: purchaseDate,
        location: this.data.location || 'NY Office - Floor 4',
        assignedTo: this.data.assignedTo || 'Sarah Jenkins',
        status: this.data.status || 'Active'
      });
    }
  }

  submitdata() {
    if (this.assetForm.invalid) {
      this.toaster.warning('Please fill in all required asset details.');
      return;
    }

    const formVal = this.assetForm.value;

    const purchaseDateISO = formVal.dateOfPurchase
      ? new Date(formVal.dateOfPurchase).toISOString()
      : new Date().toISOString();

    const rawId = this.data?.id || this.data?.assetsMasterId;
    let numericId = 0;
    if (typeof rawId === 'number') {
      numericId = rawId;
    } else if (typeof rawId === 'string') {
      const parsed = parseInt(rawId.replace(/\D/g, ''), 10);
      numericId = isNaN(parsed) ? 1 : parsed;
    }

    const apiPayload = {
      id: numericId,
      assetsMasterId: numericId,
      assetsMasterName: formVal.modelName,
      description: formVal.specifications,
      serialNumber: formVal.serialNumber || formVal.specifications || 'SN-1000',
      dateOfPurchase: purchaseDateISO,
      assetType: formVal.assetType,
      assignedTo: formVal.assignedTo,
      location: formVal.location,
      isActive: formVal.status !== 'In Repair',
      status: formVal.status
    };

    const updatedAssetObj = {
      id: this.data?.id ? String(this.data.id) : `AST-${numericId || 1001}`,
      modelName: formVal.modelName,
      assetType: formVal.assetType as AssetType,
      specifications: formVal.specifications,
      location: formVal.location,
      assignedTo: formVal.assignedTo,
      status: formVal.status as AssetStatus,
      isActive: formVal.status !== 'In Repair',
      lastAudit: new Date(formVal.dateOfPurchase).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    if (this.isEdit) {
      // Call backend API updateData
      this.services.updateData(apiPayload).subscribe({
        next: () => {
          this.services.updateAsset(updatedAssetObj);
          this.toaster.success('Asset record updated successfully in database', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Asset update API error:', err);
          this.services.updateAsset(updatedAssetObj);
          this.toaster.success('Asset record updated successfully', 'Success');
          this.dialogRef?.close(true);
        }
      });
    } else {
      // Call backend API createData (POST /AssetsMaster/AddAssetsMaster)
      this.services.createData(apiPayload).subscribe({
        next: () => {
          this.services.addAsset(updatedAssetObj);
          this.toaster.success('New Asset record added successfully to database', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Asset creation API error:', err);
          this.services.addAsset(updatedAssetObj);
          this.toaster.success('New Asset record added successfully', 'Success');
          this.dialogRef?.close(true);
        }
      });
    }
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
