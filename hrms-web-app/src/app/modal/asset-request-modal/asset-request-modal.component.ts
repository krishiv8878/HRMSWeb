import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { AssetItem } from '../../interface/asset.interface';
import { AssetRequestPriority, AssetRequestType } from '../../interface/asset-request.interface';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { NotificationService } from '../../services/notification/notification.service';

export interface AssetRequestModalData {
  asset: AssetItem;
  defaultType?: AssetRequestType;
}

@Component({
  selector: 'app-asset-request-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './asset-request-modal.component.html',
  styleUrl: './asset-request-modal.component.scss'
})
export class AssetRequestModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private requestService = inject(AssetRequestService);
  private assetService = inject(AssetsmasterService);
  private notificationService = inject(NotificationService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<AssetRequestModalComponent>);

  data: AssetRequestModalData = inject(MAT_DIALOG_DATA);

  requestForm!: FormGroup;
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  isUploading = false;
  isSubmitting = false;
  submittedOnce = false;

  get reasonCtrl() {
    return this.requestForm.get('reason');
  }

  get descriptionCtrl() {
    return this.requestForm.get('description');
  }

  requestTypes: Array<{ type: AssetRequestType; label: string; icon: string; desc: string }> = [
    {
      type: 'Repair',
      label: 'Request Repair',
      icon: 'build',
      desc: 'Hardware malfunction, broken screen, battery drain, or physical damage.'
    },
    {
      type: 'Replacement',
      label: 'Request Replacement',
      icon: 'swap_horiz',
      desc: 'Severe unfixable damage, device failure, or performance obsolescence.'
    },
    {
      type: 'Return',
      label: 'Return Asset',
      icon: 'keyboard_return',
      desc: 'Resignation, project conclusion, upgrade handover, or no longer needed.'
    }
  ];

  repairReasons = [
    'Screen Flickering / Cracked Display',
    'Battery Drain / Not Charging',
    'Keyboard / Trackpad Malfunction',
    'Overheating / Fan Noise',
    'Port / Connectivity Failure',
    'System Crashes / Blue Screen',
    'Physical Hardware Damage',
    'Other Defect'
  ];

  replacementReasons = [
    'Critical Motherboard / Hardware Failure',
    'Irreparable Physical Damage',
    'Hardware Specifications Inadequate for Workload',
    'Frequent Recurring Hardware Failures',
    'Device Life Cycle Expiration',
    'Other Replacement Reason'
  ];

  returnReasons = [
    'Employee Offboarding / Resignation Handover',
    'Hardware Upgrade Received',
    'Project Engagement Completed',
    'Excess Equipment / No Longer Needed',
    'Temporary Device Return',
    'Other Handover'
  ];

  priorities: AssetRequestPriority[] = ['Low', 'Medium', 'High', 'Critical'];

  get currentReasons(): string[] {
    const type = this.requestForm.get('requestType')?.value;
    if (type === 'Replacement') return this.replacementReasons;
    if (type === 'Return') return this.returnReasons;
    return this.repairReasons;
  }

  ngOnInit() {
    const currentEmpId = Number(localStorage.getItem('employeeId')) || this.data.asset.employeeId || 0;
    const initialType: AssetRequestType = this.data.defaultType || 'Repair';

    this.requestForm = this.fb.group({
      requestType: [initialType, [Validators.required]],
      priority: ['Medium', [Validators.required]],
      reason: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      employeeId: [currentEmpId, [Validators.required]]
    });
  }

  setRequestType(type: AssetRequestType) {
    this.requestForm.patchValue({
      requestType: type,
      reason: '' // Reset reason on tab change
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.addFiles(filesArray);
      input.value = ''; // Reset input so same file can be chosen again if needed
    }
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const filesArray = Array.from(event.dataTransfer.files);
      this.addFiles(filesArray);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private addFiles(files: File[]) {
    const validFiles = files.filter(f => {
      const isImg = f.type.startsWith('image/');
      const isValidSize = f.size <= 5 * 1024 * 1024;
      if (!isImg) this.toastr.warning(`${f.name} is not an image file.`);
      if (!isValidSize) this.toastr.warning(`${f.name} exceeds 5MB size limit.`);
      return isImg && isValidSize;
    });

    const remainingSlots = 4 - this.selectedFiles.length;
    if (remainingSlots <= 0) {
      this.toastr.info('You can upload a maximum of 4 photos.');
      return;
    }

    const toAdd = validFiles.slice(0, remainingSlots);
    for (const f of toAdd) {
      this.selectedFiles.push(f);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(f);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  async onSubmit() {
    this.submittedOnce = true;
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      const descVal = this.descriptionCtrl?.value || '';
      if (!this.reasonCtrl?.value) {
        this.toastr.warning('Please select a Primary Reason from the dropdown.', 'Reason Required');
      } else if (!descVal || descVal.trim().length < 5) {
        this.toastr.warning('Please provide at least 5 characters in the Detailed Notes describing the defect.', 'Description Required');
      } else {
        this.toastr.warning('Please fill in all required fields marked with * before submitting.', 'Incomplete Form');
      }
      return;
    }

    this.isSubmitting = true;

    try {
      let uploadedImageUrls: string[] = [];

      // Step 1: Upload images if any selected
      if (this.selectedFiles.length > 0) {
        this.isUploading = true;
        const uploadRes: any = await this.requestService.uploadImages(this.selectedFiles).toPromise();
        this.isUploading = false;
        if (uploadRes && Array.isArray(uploadRes.data)) {
          uploadedImageUrls = uploadRes.data;
        }
      }

      // Step 2: Build Create payload
      const rawAssetId = this.data.asset.id;
      const numericAssetId = typeof rawAssetId === 'number'
        ? rawAssetId
        : parseInt(String(rawAssetId).replace(/\D/g, ''), 10) || 1;

      const formVal = this.requestForm.value;

      const payload = {
        assetId: numericAssetId,
        employeeId: formVal.employeeId,
        requestType: formVal.requestType,
        priority: formVal.priority,
        reason: formVal.reason,
        description: formVal.description,
        imageUrls: uploadedImageUrls.length > 0 ? JSON.stringify(uploadedImageUrls) : undefined
      };

      this.requestService.createRequest(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toastr.success(`Your ${formVal.requestType} request has been submitted successfully!`, 'Ticket Created');
          this.assetService.fetchAssetsFromApi();
          this.notificationService.refreshNotifications();
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error submitting asset request:', err);
          this.toastr.error('Failed to submit request. Please try again.', 'Submission Error');
        }
      });
    } catch (err) {
      this.isSubmitting = false;
      this.isUploading = false;
      console.error('Error processing request:', err);
      this.toastr.error('An unexpected error occurred while processing attachments.');
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
