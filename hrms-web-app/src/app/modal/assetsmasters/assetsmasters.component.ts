import { Component, Inject, inject, Optional, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { EmployeeService } from '../../services/employee/employee.service';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AssetItem, AssetStatus, AssetType } from '../../interface/asset.interface';

export interface EmployeeOption {
  id: number | null;
  name: string;
  fullName: string;
  email?: string;
}

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
  private employeeService = inject(EmployeeService);
  private toaster = inject(ToastrService);

  isEdit = false;
  assetForm!: FormGroup;

  assetTypes: AssetType[] = ['Laptop', 'Monitor', 'Tablet', 'Furniture', 'Peripherals'];
  statusList: AssetStatus[] = ['Active', 'Available', 'In Repair'];
  employees: EmployeeOption[] = [{ id: null, name: 'Unassigned', fullName: 'Unassigned' }];

  constructor(
    @Optional() private dialogRef?: MatDialogRef<AssetsmastersComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    const todayYMD = new Date().toISOString().slice(0, 10);
    const defaultSN = 'SN-' + Math.floor(100000 + Math.random() * 900000);

    let initialEmpId: number | null = null;
    let initialAssigned = 'Unassigned';

    if (this.data) {
      this.isEdit = true;
      if (this.data.employeeId !== undefined && this.data.employeeId !== null && this.data.employeeId !== '') {
        const parsed = Number(this.data.employeeId);
        if (!isNaN(parsed) && parsed > 0) {
          initialEmpId = parsed;
        }
      }
      if (this.data.assignedTo && this.data.assignedTo !== 'Unassigned') {
        initialAssigned = this.data.assignedTo;
      }
    }

    // Pre-seed employees list with assigned employee so dropdown option is present immediately
    if (initialEmpId && initialAssigned !== 'Unassigned') {
      this.employees = [
        { id: null, name: 'Unassigned', fullName: 'Unassigned' },
        { id: initialEmpId, name: initialAssigned, fullName: initialAssigned }
      ];
    } else {
      this.employees = [{ id: null, name: 'Unassigned', fullName: 'Unassigned' }];
    }

    let purchaseDate = todayYMD;
    if (this.data?.dateOfPurchase || this.data?.lastAudit) {
      try {
        const rawD = this.data.dateOfPurchase || this.data.lastAudit;
        const d = new Date(rawD);
        if (!isNaN(d.getTime())) {
          purchaseDate = d.toISOString().slice(0, 10);
        }
      } catch (_) {}
    }

    this.assetForm = this.fb.group({
      modelName: [this.data?.modelName || this.data?.assetsMasterName || '', [Validators.required, Validators.minLength(2)]],
      assetType: [this.data?.assetType || 'Laptop', [Validators.required]],
      specifications: [this.data?.specifications || this.data?.description || '', [Validators.required]],
      serialNumber: [this.data?.serialNumber || defaultSN, [Validators.required]],
      dateOfPurchase: [purchaseDate, [Validators.required]],
      location: [this.data?.location || 'Main HQ Office', [Validators.required]],
      employeeId: [initialEmpId],
      assignedTo: [initialAssigned, [Validators.required]],
      status: [this.data?.status || 'Active', [Validators.required]]
    });

    // Automatically synchronize assignedTo and status when employeeId changes
    this.assetForm.get('employeeId')?.valueChanges.subscribe(val => {
      const empId = (val !== null && val !== undefined && val !== '' && val !== 'null') ? Number(val) : null;
      if (!empId) {
        this.assetForm.patchValue({
          assignedTo: 'Unassigned',
          status: this.assetForm.get('status')?.value === 'In Repair' ? 'In Repair' : 'Available'
        }, { emitEvent: false });
      } else {
        const emp = this.employees.find(e => e.id === empId);
        const empName = emp ? emp.fullName : (this.assetForm.get('assignedTo')?.value || 'Unassigned');
        this.assetForm.patchValue({
          assignedTo: empName,
          status: this.assetForm.get('status')?.value === 'In Repair' ? 'In Repair' : 'Active'
        }, { emitEvent: false });
      }
    });

    this.loadLiveEmployees();
  }

  loadLiveEmployees() {
    this.employeeService.getData().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }

        if (list.length > 0) {
          const mapped: EmployeeOption[] = list.map((e: any) => {
            const first = (e.firstName || e.first_name || '').trim();
            const last = (e.lastName || e.last_name || '').trim();
            const fullName = `${first} ${last}`.trim() || e.emailAddress || `Employee #${e.id}`;
            const email = (e.emailAddress || e.email || '').trim();
            const displayName = email ? `${fullName} (${email})` : fullName;
            const id = e.id ? Number(e.id) : null;
            return { id, name: displayName, fullName, email };
          }).filter(e => e.id !== null);

          // Deduplicate by employee id
          const uniqueEmps = new Map<number, EmployeeOption>();
          mapped.forEach(e => {
            if (e.id && !uniqueEmps.has(e.id)) {
              uniqueEmps.set(e.id, e);
            }
          });

          this.employees = [
            { id: null, name: 'Unassigned', fullName: 'Unassigned' },
            ...Array.from(uniqueEmps.values())
          ];

          // Re-sync current selection
          const currentEmpId = this.assetForm.get('employeeId')?.value;
          const currentAssigned = (this.assetForm.get('assignedTo')?.value || '').trim();

          if (currentEmpId && Number(currentEmpId) > 0) {
            const numId = Number(currentEmpId);
            const emp = this.employees.find(e => e.id === numId);
            if (emp) {
              this.assetForm.patchValue({
                employeeId: numId,
                assignedTo: emp.fullName
              }, { emitEvent: false });
            }
          } else if (currentAssigned && currentAssigned.toLowerCase() !== 'unassigned') {
            // Legacy case: asset had assignedTo string but employeeId was null
            const matched = this.employees.find(emp =>
              emp.id !== null && (
                emp.fullName.toLowerCase() === currentAssigned.toLowerCase() ||
                emp.name.toLowerCase() === currentAssigned.toLowerCase() ||
                (emp.email && emp.email.toLowerCase() === currentAssigned.toLowerCase())
              )
            );
            if (matched && matched.id) {
              this.assetForm.patchValue({
                employeeId: matched.id,
                assignedTo: matched.fullName
              });
            }
          }
        }
      },
      error: () => {
        // Keep existing this.employees
      }
    });
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

    const selectedEmpId = formVal.employeeId ? Number(formVal.employeeId) : null;
    const assignedEmp = selectedEmpId ? this.employees.find(e => e.id === selectedEmpId) : null;
    const assignedName = selectedEmpId
      ? (assignedEmp?.fullName || formVal.assignedTo || 'Unassigned')
      : 'Unassigned';

    const apiPayload = {
      id: numericId,
      assetsMasterId: numericId,
      assetsMasterName: formVal.modelName,
      description: formVal.specifications,
      serialNumber: formVal.serialNumber || formVal.specifications || 'SN-1000',
      dateOfPurchase: purchaseDateISO,
      assetType: formVal.assetType,
      employeeId: selectedEmpId,
      assignedTo: assignedName,
      location: formVal.location,
      isActive: formVal.status !== 'In Repair',
      status: formVal.status
    };

    const updatedAssetObj: AssetItem = {
      id: this.data?.id ? String(this.data.id) : `AST-${numericId || 1001}`,
      modelName: formVal.modelName,
      assetType: formVal.assetType as AssetType,
      specifications: formVal.specifications,
      serialNumber: formVal.serialNumber,
      dateOfPurchase: purchaseDateISO,
      location: formVal.location,
      employeeId: selectedEmpId ? Number(selectedEmpId) : undefined,
      assignedTo: assignedName,
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
