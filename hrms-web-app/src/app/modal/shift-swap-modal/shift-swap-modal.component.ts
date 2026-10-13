import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { ShiftRosterService } from '../../services/shift/shift-roster.service';
import { EmployeeshiftService, ShiftModel } from '../../services/shift/employeeshift.service';
import { EmployeeService } from '../../services/employee/employee.service';

@Component({
  selector: 'app-shift-swap-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './shift-swap-modal.component.html',
  styleUrl: './shift-swap-modal.component.scss'
})
export class ShiftSwapModalComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<ShiftSwapModalComponent>);
  private fb = inject(FormBuilder);
  private rosterService = inject(ShiftRosterService);
  private shiftService = inject(EmployeeshiftService);
  private toaster = inject(ToastrService);

  private employeeService = inject(EmployeeService);

  swapForm!: FormGroup;
  employeesList: any[] = [];
  shiftsList: ShiftModel[] = [];
  isSelfService: boolean = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.employeesList = data?.employees || [];
    this.shiftsList = data?.shifts || [];
    this.isSelfService = !!data?.isSelfService || !data?.isHrAdmin;
  }

  ngOnInit(): void {
    if (this.employeesList.length === 0) {
      this.employeeService.getData().subscribe({
        next: (res: any) => {
          let emps: any[] = [];
          if (Array.isArray(res)) emps = res;
          else if (res && Array.isArray(res.data)) emps = res.data;
          else if (res && Array.isArray(res.employeedata?.data)) emps = res.employeedata.data;
          this.employeesList = emps.filter((e: any) => !e.isDeleted);
          this.initForm();
        },
        error: () => this.initForm()
      });
    } else {
      this.initForm();
    }
  }

  private initForm(): void {
    const todayStr = this.rosterService.formatDate(new Date());
    const defaultEmpId = this.data?.currentEmployeeId || (this.employeesList[0]?.id || 1);
    const defaultTargetId = this.employeesList.find(e => e.id !== defaultEmpId)?.id || (this.employeesList[1]?.id || 2);

    this.swapForm = this.fb.group({
      requesterEmployeeId: [defaultEmpId, Validators.required],
      requesterDate: [todayStr, Validators.required],
      targetEmployeeId: [defaultTargetId, Validators.required],
      targetDate: [todayStr, Validators.required],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  getRequesterCurrentShift(): string {
    const empId = Number(this.swapForm?.get('requesterEmployeeId')?.value);
    const dateStr = this.swapForm?.get('requesterDate')?.value;
    if (!empId || !dateStr) return 'General Shift (09:30 - 18:30)';
    const entry = this.rosterService.getEmployeeRosterEntry(empId, dateStr);
    return entry.shiftName || 'General Shift';
  }

  getTargetCurrentShift(): string {
    const empId = Number(this.swapForm?.get('targetEmployeeId')?.value);
    const dateStr = this.swapForm?.get('targetDate')?.value;
    if (!empId || !dateStr) return 'Morning Shift (07:00 - 16:00)';
    const entry = this.rosterService.getEmployeeRosterEntry(empId, dateStr);
    return entry.shiftName || 'Morning Shift';
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }

  submitSwap(): void {
    if (this.swapForm.invalid) {
      this.swapForm.markAllAsTouched();
      this.toaster.error('Please fill in all required shift swap fields', 'Validation Error');
      return;
    }

    const val = this.swapForm.value;
    if (Number(val.requesterEmployeeId) === Number(val.targetEmployeeId)) {
      this.toaster.error('Cannot swap shifts with yourself. Please select a colleague.', 'Invalid Selection');
      return;
    }

    const reqEmp = this.employeesList.find(e => Number(e.id) === Number(val.requesterEmployeeId));
    const targetEmp = this.employeesList.find(e => Number(e.id) === Number(val.targetEmployeeId));

    const reqName = reqEmp ? `${reqEmp.firstName || ''} ${reqEmp.lastName || ''}`.trim() : `Employee #${val.requesterEmployeeId}`;
    const targetName = targetEmp ? `${targetEmp.firstName || ''} ${targetEmp.lastName || ''}`.trim() : `Employee #${val.targetEmployeeId}`;

    const reqEntry = this.rosterService.getEmployeeRosterEntry(Number(val.requesterEmployeeId), val.requesterDate);
    const targetEntry = this.rosterService.getEmployeeRosterEntry(Number(val.targetEmployeeId), val.targetDate);

    this.rosterService.createSwapRequest({
      requesterEmployeeId: Number(val.requesterEmployeeId),
      requesterName: reqName,
      requesterDate: val.requesterDate,
      requesterShiftId: typeof reqEntry.shiftId === 'number' ? reqEntry.shiftId : 1,
      requesterShiftName: reqEntry.shiftName || 'General Shift',
      targetEmployeeId: Number(val.targetEmployeeId),
      targetName: targetName,
      targetDate: val.targetDate,
      targetShiftId: typeof targetEntry.shiftId === 'number' ? targetEntry.shiftId : 2,
      targetShiftName: targetEntry.shiftName || 'Morning Shift',
      reason: val.reason.trim()
    });

    this.toaster.success(`Shift swap request submitted for ${targetName}'s approval`, 'Request Submitted');
    this.dialogRef.close(true);
  }
}
