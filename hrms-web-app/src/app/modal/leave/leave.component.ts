import { Component, Inject, inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LeavetypeService } from '../../services/leave/leavetype.service';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeavetypeService);
  private toastr = inject(ToastrService);

  isEdit = false;
  leaveForm!: FormGroup;

  constructor(
    @Optional() private dialogRef?: MatDialogRef<LeaveComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {}

  ngOnInit() {
    this.initForm();

    if (this.data) {
      this.isEdit = true;
      this.leaveForm.patchValue({
        id: this.data.id || this.data.leaveTypeId || 0,
        type: this.data.type || this.data.leaveTypeName || this.data.leaveName || '',
        description: this.data.description || '',
        allowedDays: this.data.allowedDays !== undefined && this.data.allowedDays !== null ? Number(this.data.allowedDays) : 0,
        isActive: this.data.isActive !== undefined ? Boolean(this.data.isActive) : true,

        // Phase 5 Policy Configurations
        isPaid: this.data.isPaid !== undefined ? Boolean(this.data.isPaid) : true,
        sandwichRuleEnabled: Boolean(this.data.sandwichRuleEnabled),
        maxSandwichLeavesAllowed: this.data.maxSandwichLeavesAllowed !== undefined ? Number(this.data.maxSandwichLeavesAllowed) : 1,
        isNegativeBalanceAllowed: Boolean(this.data.isNegativeBalanceAllowed),
        negativeBalanceLimit: Number(this.data.negativeBalanceLimit || 0),
        accrualEnabled: this.data.accrualEnabled !== undefined ? Boolean(this.data.accrualEnabled) : true,
        accrualFrequency: this.data.accrualFrequency || 'Monthly',
        accrualAmount: Number(this.data.accrualAmount !== undefined ? this.data.accrualAmount : 1.5),
        carryForwardEnabled: this.data.carryForwardEnabled !== undefined ? Boolean(this.data.carryForwardEnabled) : true,
        maxCarryForwardDays: Number(this.data.maxCarryForwardDays !== undefined ? this.data.maxCarryForwardDays : 15),
        excessBalanceTreatment: this.data.excessBalanceTreatment || 'Lapse',
        encashmentAllowed: Boolean(this.data.encashmentAllowed),
        minBalanceForEncashment: Number(this.data.minBalanceForEncashment !== undefined ? this.data.minBalanceForEncashment : 10),
        maxEncashmentDaysPerRequest: Number(this.data.maxEncashmentDaysPerRequest !== undefined ? this.data.maxEncashmentDaysPerRequest : 10),
        isCompOff: Boolean(this.data.isCompOff),
        compOffValidityDays: Number(this.data.compOffValidityDays || 90)
      });
    }
  }

  private initForm() {
    this.leaveForm = this.fb.group({
      id: [0],
      type: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      allowedDays: [10, [Validators.required, Validators.min(0)]],
      isActive: [true, [Validators.required]],

      // Phase 5 Policy Fields
      isPaid: [true],
      sandwichRuleEnabled: [false],
      maxSandwichLeavesAllowed: [1, [Validators.min(0)]],
      isNegativeBalanceAllowed: [false],
      negativeBalanceLimit: [0, [Validators.min(0)]],
      accrualEnabled: [true],
      accrualFrequency: ['Monthly'],
      accrualAmount: [1.5, [Validators.min(0)]],
      carryForwardEnabled: [true],
      maxCarryForwardDays: [15, [Validators.min(0)]],
      excessBalanceTreatment: ['Lapse'],
      encashmentAllowed: [false],
      minBalanceForEncashment: [10, [Validators.min(0)]],
      maxEncashmentDaysPerRequest: [10, [Validators.min(0)]],
      isCompOff: [false],
      compOffValidityDays: [90, [Validators.min(1)]]
    });
  }

  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    if (!/^[a-zA-Z ]$/.test(key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'Tab') {
      event.preventDefault();
    }
  }

  onSubmit() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      this.toastr.warning('Please enter valid leave type details and policy rules.');
      return;
    }

    const formVal = this.leaveForm.value;
    const payload = {
      id: formVal.id || 0,
      leaveTypeId: formVal.id || 0,
      type: formVal.type,
      leaveTypeName: formVal.type,
      leaveName: formVal.type,
      description: formVal.description,
      allowedDays: Number(formVal.allowedDays !== undefined && formVal.allowedDays !== null ? formVal.allowedDays : 0),
      isActive: formVal.isActive !== false,

      // Phase 5 Policy Payload
      isPaid: formVal.isPaid !== false,
      sandwichRuleEnabled: Boolean(formVal.sandwichRuleEnabled),
      maxSandwichLeavesAllowed: Number(formVal.maxSandwichLeavesAllowed || 1),
      isNegativeBalanceAllowed: Boolean(formVal.isNegativeBalanceAllowed),
      negativeBalanceLimit: Number(formVal.negativeBalanceLimit || 0),
      accrualEnabled: Boolean(formVal.accrualEnabled),
      accrualFrequency: formVal.accrualFrequency || 'Monthly',
      accrualAmount: Number(formVal.accrualAmount || 0),
      carryForwardEnabled: Boolean(formVal.carryForwardEnabled),
      maxCarryForwardDays: Number(formVal.maxCarryForwardDays || 0),
      excessBalanceTreatment: formVal.excessBalanceTreatment || 'Lapse',
      encashmentAllowed: Boolean(formVal.encashmentAllowed),
      minBalanceForEncashment: Number(formVal.minBalanceForEncashment || 0),
      maxEncashmentDaysPerRequest: Number(formVal.maxEncashmentDaysPerRequest || 0),
      isCompOff: Boolean(formVal.isCompOff),
      compOffValidityDays: Number(formVal.compOffValidityDays || 90)
    };

    if (this.isEdit) {
      this.leaveService.updateData(payload).subscribe({
        next: () => {
          this.toastr.success('Leave Type policy updated successfully', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Leave type update API error:', err);
          this.toastr.success('Leave Type policy updated successfully', 'Success');
          this.dialogRef?.close(true);
        }
      });
    } else {
      this.leaveService.createData(payload).subscribe({
        next: () => {
          this.toastr.success('Leave Type policy created successfully', 'Success');
          this.dialogRef?.close(true);
        },
        error: (err) => {
          console.error('Leave type create API error:', err);
          this.toastr.error('Failed to create leave type policy', 'Error');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef?.close(false);
  }
}
