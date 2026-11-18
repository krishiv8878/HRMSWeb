import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { AssetItem } from '../../interface/asset.interface';
import { AssetRequestItem } from '../../interface/asset-request.interface';
import { AssetRequestService } from '../../services/asset-request/asset-request.service';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { RbacService } from '../../core/rbac.service';
import { NotificationService } from '../../services/notification/notification.service';

export interface AssetTrackingModalData {
  asset: AssetItem;
  request: AssetRequestItem;
  isAdmin?: boolean;
}

@Component({
  selector: 'app-asset-tracking-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './asset-tracking-modal.component.html',
  styleUrl: './asset-tracking-modal.component.scss'
})
export class AssetTrackingModalComponent implements OnInit {
  private requestService = inject(AssetRequestService);
  private assetService = inject(AssetsmasterService);
  private rbacService = inject(RbacService);
  private notificationService = inject(NotificationService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<AssetTrackingModalComponent>);

  data: AssetTrackingModalData = inject(MAT_DIALOG_DATA);

  request!: AssetRequestItem;
  isConfirmingReceipt = false;
  parsedImageUrls: string[] = [];
  selectedImageModal: string | null = null;

  // Replacement dispatch state
  availableReplacementAssets: AssetItem[] = [];
  matchingCategoryReplacementAssets: AssetItem[] = [];
  otherCategoryReplacementAssets: AssetItem[] = [];
  selectedDispatchReplacementId: string = '';
  selectedDispatchReplacementAsset: AssetItem | null = null;

  get isAdmin(): boolean {
    if (this.rbacService.isAdmin()) return true;
    return this.data.isAdmin === true;
  }

  get replacementAssetName(): string | null {
    if (this.request?.replacementAssetName) {
      return this.request.replacementAssetName;
    }
    const desc = this.request?.description || '';
    const match = desc.match(/(?:\[Selected Replacement Asset:|\[Requested Replacement Device:)\s*([^\]]+)\]/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  get cleanDescription(): string {
    const desc = this.request?.description || '';
    return desc
      .replace(/\[(?:Selected Replacement Asset|Requested Replacement Device|Replacement Preference):\s*([^\]]+)\]/gi, '')
      .trim();
  }

  // Admin action panels state
  activeAdminAction: 'dispatch' | 'approve' | 'reject' | 'qa' | 'repair' | 'pickup' | 'desk_handover_receive' | null = null;
  isProcessingAction = false;

  adminDispatchMode: 'Courier Dispatch' | 'Direct IT Desk Handover' = 'Courier Dispatch';
  adminCourierPartner: string = 'BlueDart Express';
  adminTrackingNumber: string = '';
  adminRemarks: string = '';
  rejectionReason: string = '';

  // QA Inspection Model for Returns
  qaPhysicalConditionOk: boolean = true;
  qaAccessoriesReturned: boolean = true;
  qaPowerOnWorking: boolean = true;
  qaDataWiped: boolean = true;
  qaInspectionRemarks: string = '';

  courierOptions: string[] = [
    'BlueDart Express',
    'DTDC Express',
    'Delhivery',
    'FedEx India',
    'Trackon Couriers',
    'Shadowfax',
    'Ecom Express',
    'Professional Couriers'
  ];

  // Employee Handover (When approved)
  isEmployeeHandoverOpen: boolean = false;
  employeeHandoverMode: 'Courier Dispatch' | 'Direct IT Desk Handover' = 'Direct IT Desk Handover';
  employeeCourierPartner: string = 'BlueDart Express';
  employeeTrackingNumber: string = '';
  employeeHandoverNotes: string = '';

  isClosingTicket = false;
  isConfirmingPickup = false;

  get isDirectDeskHandover(): boolean {
    const s = (this.request?.status || '').toLowerCase();
    const cp = (this.request?.courierPartner || '').toLowerCase();
    const tn = (this.request?.trackingNumber || '').toLowerCase();
    const rem = ((this.request?.adminRemarks || '') + ' ' + (this.request?.remarks || '') + ' ' + (this.request?.reason || '')).toLowerCase();
    return s.includes('desk') || s.includes('handover') || cp.includes('desk') || cp.includes('direct') || cp.includes('in-person') || tn.includes('desk-handover') || rem.includes('it desk') || rem.includes('in-person');
  }

  get isAwaitingDeskHandoverAck(): boolean {
    const s = (this.request?.status || '').toLowerCase();
    const isFinished = s.includes('received') || s.includes('repair') || s.includes('replacement in progress') || s.includes('dispatch') || s.includes('deliver') || s.includes('completed') || s.includes('closed') || s.includes('reject');
    return (s.includes('desk') || s.includes('handed over') || s.includes('handover') || (this.isDirectDeskHandover && s.includes('transit'))) && !isFinished;
  }

  get isAwaitingCourierInTransit(): boolean {
    const s = (this.request?.status || '').toLowerCase();
    const isFinished = s.includes('received') || s.includes('repair') || s.includes('replacement in progress') || s.includes('dispatch') || s.includes('deliver') || s.includes('completed') || s.includes('closed') || s.includes('reject');
    return !this.isDirectDeskHandover && (s.includes('transit') || s.includes('picked up')) && !isFinished;
  }

  get canEmployeeSendDevice(): boolean {
    if (this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase();
    return s.includes('approved') && !s.includes('transit') && !s.includes('pickup') && !s.includes('desk') && !s.includes('handed over') && !s.includes('repair') && !s.includes('replacement in progress') && !s.includes('dispatch') && !s.includes('deliver') && !s.includes('received') && !s.includes('completed') && !s.includes('reject') && !s.includes('closed');
  }

  get canEmployeeConfirmPickup(): boolean {
    if (this.isAdmin) return false;
    if (this.isDirectDeskHandover) return false;
    const s = (this.request?.status || '').toLowerCase();
    const isFinished = s.includes('received') || s.includes('repair') || s.includes('replacement in progress') || s.includes('dispatch') || s.includes('deliver') || s.includes('completed') || s.includes('closed') || s.includes('reject');
    return (s.includes('pickup scheduled') || s.includes('awaiting courier pickup')) && !s.includes('picked up') && !isFinished;
  }

  // --- Strictly Phased Admin Action Stage Getters ---
  get canAdminApproveOrReject(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    return s === 'submitted' || s === 'replacement requested' || s === 'repair requested' || s === 'return initiated' || s === 'initiated';
  }

  get canAdminManagePickupOrDeskHandover(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    return s === 'approved';
  }

  get canAdminAcknowledgeDeskHandover(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    const isFinished = s.includes('received') || s.includes('repair') || s.includes('progress') || s.includes('dispatch') || s.includes('deliver') || s.includes('completed') || s.includes('closed') || s.includes('reject');
    return !isFinished && (this.isAwaitingDeskHandoverAck || s.includes('desk') || s.includes('handover'));
  }

  get canAdminAcknowledgeCourierArrival(): boolean {
    if (!this.isAdmin) return false;
    if (this.isDirectDeskHandover) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    return (s.includes('transit') || s.includes('pickup scheduled')) && !s.includes('received') && !s.includes('repair') && !s.includes('progress') && !s.includes('dispatch') && !s.includes('completed') && !s.includes('closed') && !s.includes('reject');
  }

  get canAdminDispatch(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    const type = this.request?.requestType;

    // Never show when pending approval, in transit, awaiting handover, or already dispatched/closed
    const isPendingApproval = s === 'submitted' || s.includes('requested') || s.includes('initiated');
    const isAwaitingHandover = s === 'approved' || s.includes('transit') || s.includes('pickup') || s === 'handed over at it desk';
    const isAlreadyDispatchedOrClosed = s.includes('dispatch') || s.includes('deliver') || s.includes('completed') || s.includes('closed') || s.includes('reject');

    if (isPendingApproval || isAwaitingHandover || isAlreadyDispatchedOrClosed) {
      return false;
    }

    if (type === 'Replacement') {
      return s.includes('replacement in progress') || s.includes('progress') || s.includes('received') || s === 'in repair';
    }

    if (type === 'Repair') {
      return s === 'in repair' || s.includes('in repair') || s.includes('repaired');
    }

    return false;
  }

  get canAdminMarkDelivered(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    return s.includes('dispatch') && !s.includes('deliver') && !s.includes('completed') && !s.includes('closed') && !s.includes('reject');
  }

  get canAdminInspectReturn(): boolean {
    if (!this.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase().trim();
    return this.request?.requestType === 'Return' && s.includes('received') && !s.includes('completed') && !s.includes('closed') && !s.includes('reject');
  }

  get isRejected(): boolean {
    const s = (this.request?.status || '').toLowerCase();
    const isClosed = s.includes('closed');
    return s.includes('reject') || (isClosed && ((this.request?.adminRemarks || '') + ' ' + (this.request?.remarks || '')).toLowerCase().includes('reject'));
  }

  // Lifecycle steps for visual stepper
  get timelineSteps(): Array<{ title: string; subtitle: string; isCompleted: boolean; isCurrent: boolean; isRejected?: boolean; icon: string }> {
    const s = (this.request?.status || '').toLowerCase();
    const isClosed = s.includes('closed');
    const isRejected = this.isRejected;

    if (isRejected) {
      return [
        {
          title: 'Request Submitted',
          subtitle: this.request?.createdDate ? new Date(this.request.createdDate).toLocaleDateString() : 'Submitted',
          isCompleted: true,
          isCurrent: false,
          isRejected: false,
          icon: 'send'
        },
        {
          title: 'IT Review Decision',
          subtitle: 'Request Rejected',
          isCompleted: true,
          isCurrent: !isClosed,
          isRejected: true,
          icon: 'cancel'
        },
        {
          title: 'Ticket Closed',
          subtitle: isClosed ? 'Closed • Asset Active' : 'Awaiting Close Confirmation',
          isCompleted: isClosed,
          isCurrent: isClosed,
          isRejected: false,
          icon: 'check_circle'
        }
      ];
    }

    const isDirect = this.isDirectDeskHandover;
    const isSubmitted = true;
    const isApproved = s.includes('approved') || s.includes('transit') || s.includes('pickup') || s.includes('desk') || s.includes('handed over') || s.includes('repair') || s.includes('repaired') || s.includes('dispatch') || s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
    const inTransitToIT = s.includes('transit') || s.includes('pickup') || s.includes('desk') || s.includes('handed over') || s.includes('repair') || s.includes('repaired') || s.includes('dispatch') || s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
    const inService = s.includes('in repair') || s.includes('repaired') || s.includes('dispatch') || s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
    const isDispatched = s.includes('dispatch') || s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
    const isDelivered = s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
    const isDone = s.includes('completed') || isClosed;

    if (this.request?.requestType === 'Return') {
      return [
        {
          title: 'Return Initiated',
          subtitle: this.request.createdDate ? new Date(this.request.createdDate).toLocaleDateString() : 'Initiated',
          isCompleted: isSubmitted,
          isCurrent: s.includes('initiated') || s === 'submitted',
          isRejected: false,
          icon: 'assignment_return'
        },
        {
          title: 'Approved by IT',
          subtitle: isApproved ? 'Return Authorized' : 'Pending',
          isCompleted: isApproved,
          isCurrent: s.includes('approved') && !s.includes('transit') && !s.includes('desk') && !s.includes('handed over'),
          isRejected: false,
          icon: 'thumb_up'
        },
        {
          title: isDirect ? 'Handed Over at IT Desk' : 'In Transit / Handover',
          subtitle: isDirect
            ? (inTransitToIT ? (this.request.trackingNumber || 'In-Person Desk Handover') : 'Pending Desk Handover')
            : (this.request.trackingNumber ? `${this.request.courierPartner || 'Courier'} (${this.request.trackingNumber})` : (inTransitToIT ? 'In Transit' : 'Pending')),
          isCompleted: inTransitToIT,
          isCurrent: (s.includes('transit') || s.includes('pickup') || s.includes('desk') || s.includes('handed over')) && !s.includes('received'),
          isRejected: false,
          icon: isDirect ? 'desk' : 'local_shipping'
        },
        {
          title: 'Received by Admin',
          subtitle: this.request.receivedDate ? new Date(this.request.receivedDate).toLocaleDateString() : (s.includes('received') ? 'Received' : 'Pending Inspection'),
          isCompleted: isDelivered,
          isCurrent: s.includes('received'),
          isRejected: false,
          icon: 'inventory'
        },
        {
          title: 'QA Inspected & Returned',
          subtitle: isDone ? 'In Available Inventory' : 'Pending QA',
          isCompleted: isDone,
          isCurrent: isDone,
          isRejected: false,
          icon: 'verified'
        }
      ];
    }

    if (this.request?.requestType === 'Replacement') {
      const isReplacementInPrep = s.includes('replacement') || s.includes('in repair') || s.includes('repaired') || s.includes('dispatch') || s.includes('deliver') || s.includes('received') || s.includes('completed') || isClosed;
      return [
        {
          title: 'Replacement Requested',
          subtitle: this.request.createdDate ? new Date(this.request.createdDate).toLocaleDateString() : 'Submitted',
          isCompleted: isSubmitted,
          isCurrent: s === 'submitted' || s.includes('requested') || s.includes('initiated'),
          isRejected: false,
          icon: 'swap_horiz'
        },
        {
          title: 'Approved by IT',
          subtitle: isApproved ? 'Replacement Authorized' : 'Under Review',
          isCompleted: isApproved,
          isCurrent: s.includes('approved') && !s.includes('transit') && !s.includes('pickup') && !s.includes('desk') && !s.includes('handed over') && !s.includes('replacement'),
          isRejected: false,
          icon: 'thumb_up'
        },
        {
          title: isDirect ? 'Old Asset Handed Over' : 'Old Asset in Transit to IT',
          subtitle: isDirect
            ? (inTransitToIT ? (this.request.trackingNumber || 'In-Person Desk Handover') : 'Pending Desk Handover')
            : (this.request.trackingNumber ? `${this.request.courierPartner || 'Courier'} (${this.request.trackingNumber})` : (inTransitToIT ? 'In Transit' : 'Pending Handover')),
          isCompleted: inTransitToIT,
          isCurrent: (s.includes('transit') || s.includes('pickup') || s.includes('desk') || s.includes('handed over')) && !isReplacementInPrep,
          isRejected: false,
          icon: isDirect ? 'desk' : 'local_shipping'
        },
        {
          title: 'Preparing Replacement Device',
          subtitle: isReplacementInPrep ? (this.replacementAssetName ? `Allocated: ${this.replacementAssetName}` : 'Allocated from Stock') : 'Pending Old Asset Handover',
          isCompleted: isReplacementInPrep,
          isCurrent: (s.includes('replacement') || s.includes('in repair') || s.includes('received')) && !isDispatched,
          isRejected: false,
          icon: 'devices'
        },
        {
          title: 'Replacement Dispatched',
          subtitle: isDispatched ? (this.request.trackingNumber ? `${this.request.courierPartner || 'Dispatched'} (${this.request.trackingNumber})` : 'Dispatched') : 'Pending Dispatch',
          isCompleted: isDispatched,
          isCurrent: s.includes('dispatch'),
          isRejected: false,
          icon: 'local_shipping'
        },
        {
          title: 'New Device Received & Active',
          subtitle: isDone ? 'Confirmed & Active' : (isDelivered ? 'Delivered' : 'Pending Receipt'),
          isCompleted: isDone,
          isCurrent: isDone,
          isRejected: false,
          icon: 'check_circle'
        }
      ];
    }

    return [
      {
        title: 'Request Submitted',
        subtitle: this.request.createdDate ? new Date(this.request.createdDate).toLocaleDateString() : 'Submitted',
        isCompleted: isSubmitted,
        isCurrent: s === 'submitted' || s.includes('requested'),
        isRejected: false,
        icon: 'send'
      },
      {
        title: 'Approved by IT',
        subtitle: isApproved ? 'Diagnostics Approved' : 'Under Review',
        isCompleted: isApproved,
        isCurrent: s.includes('approved') && !s.includes('transit') && !s.includes('pickup') && !s.includes('desk') && !s.includes('handed over'),
        isRejected: false,
        icon: 'thumb_up'
      },
      {
        title: isDirect ? 'Handed Over at IT Desk' : 'In Transit to IT / Vendor',
        subtitle: isDirect
          ? (inTransitToIT ? (this.request.trackingNumber || 'In-Person Desk Handover') : 'Pending Desk Handover')
          : (this.request.trackingNumber ? `${this.request.courierPartner || 'Courier'} (${this.request.trackingNumber})` : (inTransitToIT ? 'In Transit' : 'Pending Handover')),
        isCompleted: inTransitToIT,
        isCurrent: (s.includes('transit') || s.includes('pickup') || s.includes('desk') || s.includes('handed over')) && !inService,
        isRejected: false,
        icon: isDirect ? 'desk' : 'local_shipping'
      },
      {
        title: 'In Repair / Service',
        subtitle: inService ? 'Vendor Servicing' : 'Pending',
        isCompleted: inService,
        isCurrent: s === 'in repair' || s === 'repair completed',
        isRejected: false,
        icon: 'build'
      },
      {
        title: 'Dispatched to Employee',
        subtitle: isDispatched ? (this.request.trackingNumber ? `${this.request.courierPartner || 'Dispatched'} (${this.request.trackingNumber})` : 'Dispatched') : 'Pending',
        isCompleted: isDispatched,
        isCurrent: s.includes('dispatch'),
        isRejected: false,
        icon: 'airport_shuttle'
      },
      {
        title: 'Received & Verified',
        subtitle: isDone ? 'Active & Working' : (isDelivered ? 'Delivered' : 'Pending Receipt'),
        isCompleted: isDone,
        isCurrent: isDone,
        isRejected: false,
        icon: 'check_circle'
      }
    ];
  }

  get canEmployeeConfirmReceipt(): boolean {
    if (this.data.isAdmin) return false;
    const s = (this.request?.status || '').toLowerCase();
    return (s.includes('dispatch') || s.includes('deliver')) && !s.includes('completed');
  }

  ngOnInit() {
    this.request = this.data.request;
    this.parseImages();
    if (this.request?.requestType === 'Replacement') {
      this.loadReplacementAssetsForDispatch();
    }
    this.refreshRequestDetails();
  }

  parseImages() {
    if (this.request?.imageUrls) {
      try {
        const parsed = JSON.parse(this.request.imageUrls);
        if (Array.isArray(parsed)) {
          this.parsedImageUrls = parsed;
          return;
        }
      } catch (_) {}

      this.parsedImageUrls = this.request.imageUrls.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  refreshRequestDetails() {
    if (this.request?.id) {
      this.requestService.getRequestById(this.request.id).subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.request = res.data;
            this.parseImages();
          }
        }
      });
    }
  }

  openEmployeeHandover() {
    this.isEmployeeHandoverOpen = true;
    this.employeeTrackingNumber = '';
    this.employeeHandoverNotes = '';
  }

  closeEmployeeHandover() {
    this.isEmployeeHandoverOpen = false;
  }

  submitEmployeeHandover() {
    const isDirect = this.employeeHandoverMode === 'Direct IT Desk Handover';
    if (!isDirect && !this.employeeTrackingNumber.trim()) {
      this.toastr.warning('Please enter an AWB / Tracking number for parcel tracking.', 'AWB Required');
      return;
    }

    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'Employee';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload = {
      requestId: this.request.id,
      newStatus: isDirect ? 'Handed Over at IT Desk' : 'In Transit',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      courierPartner: isDirect ? 'Direct IT Desk Handover' : this.employeeCourierPartner,
      trackingNumber: isDirect ? (this.employeeTrackingNumber.trim() || 'DESK-HANDOVER') : this.employeeTrackingNumber.trim(),
      remarks: isDirect
        ? `Employee handed over equipment directly at IT desk. Note: ${this.employeeHandoverNotes || 'In-Person Handover'}`
        : `Employee shipped equipment via ${this.employeeCourierPartner} (AWB: ${this.employeeTrackingNumber}). Note: ${this.employeeHandoverNotes || 'Sent to IT/Vendor'}`
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.isEmployeeHandoverOpen = false;
        const msg = isDirect
          ? 'In-person IT Desk Handover recorded! Awaiting IT Helpdesk receipt.'
          : 'Courier dispatch recorded! Equipment marked as In Transit.';
        this.toastr.success(msg, 'Handover Recorded');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error submitting employee handover:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to submit shipping details.';
        this.toastr.error(msg, 'Error');
      }
    });
  }

  closeRejectedTicket() {
    this.isClosingTicket = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'User';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload = {
      requestId: this.request.id,
      newStatus: 'Closed',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      remarks: this.isAdmin
        ? `Ticket officially closed and archived by Administrator (${currentUserName}). Initial decision: Rejected.`
        : `Ticket closed and acknowledged by Employee (${currentUserName}). Initial decision: Rejected. Asset remains Active.`
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isClosingTicket = false;
        try {
          const stored = localStorage.getItem('hrms_dismissed_rejection_ids');
          const ids: number[] = stored ? JSON.parse(stored) : [];
          if (this.request?.id && !ids.includes(this.request.id)) {
            ids.push(this.request.id);
            localStorage.setItem('hrms_dismissed_rejection_ids', JSON.stringify(ids));
          }
        } catch {}
        this.toastr.success('Ticket has been officially closed and archived.', 'Ticket Closed');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isClosingTicket = false;
        console.error('Error closing ticket:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to close ticket.';
        this.toastr.error(msg, 'Error');
      }
    });
  }

  confirmReceived() {
    this.isConfirmingReceipt = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'Employee';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload: any = {
      requestId: this.request.id,
      newStatus: 'Completed',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      remarks: 'Employee confirmed parcel receipt. Equipment verified functional and ticket completed.',
      replacementAssetId: this.request?.replacementAssetId,
      replacementAssetName: this.request?.replacementAssetName || this.replacementAssetName || undefined
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isConfirmingReceipt = false;
        this.toastr.success('Receipt confirmed! Your asset is now Active and working.', 'Equipment Received');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isConfirmingReceipt = false;
        console.error('Error confirming asset receipt:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to update status. Please try again.';
        this.toastr.error(msg, 'Error');
      }
    });
  }

  openAdminAction(action: 'dispatch' | 'approve' | 'reject' | 'qa' | 'repair' | 'pickup' | 'desk_handover_receive') {
    this.activeAdminAction = action;
    this.adminRemarks = '';
    this.rejectionReason = '';
    if (this.request?.requestType === 'Replacement') {
      this.loadReplacementAssetsForDispatch();
    }
    if (action === 'pickup') {
      this.adminCourierPartner = 'BlueDart Express';
      this.adminTrackingNumber = '';
    } else if (action === 'dispatch') {
      this.adminDispatchMode = 'Courier Dispatch';
      this.adminCourierPartner = 'BlueDart Express';
      this.adminTrackingNumber = '';
    } else if (action === 'desk_handover_receive') {
      this.adminTrackingNumber = '';
    }
  }

  closeAdminAction() {
    this.activeAdminAction = null;
  }

  approveRequest() {
    const isReplacement = this.request?.requestType === 'Replacement';
    let repId: number | undefined = undefined;
    let repName: string | undefined = undefined;

    if (isReplacement && this.selectedDispatchReplacementAsset) {
      repId = parseInt(String(this.selectedDispatchReplacementAsset.id).replace(/\D/g, ''), 10) || undefined;
      repName = `${this.selectedDispatchReplacementAsset.modelName} (SN: ${this.selectedDispatchReplacementAsset.serialNumber || 'N/A'}, Asset ID #${this.selectedDispatchReplacementAsset.id})`;
    } else if (isReplacement && this.selectedDispatchReplacementId && this.selectedDispatchReplacementId !== 'PROCURED_DEVICE') {
      const chosen = this.availableReplacementAssets.find(a => String(a.id) === String(this.selectedDispatchReplacementId));
      if (chosen) {
        repId = parseInt(String(chosen.id).replace(/\D/g, ''), 10) || undefined;
        repName = `${chosen.modelName} (SN: ${chosen.serialNumber || 'N/A'}, Asset ID #${chosen.id})`;
      }
    } else if (isReplacement && this.request?.replacementAssetId) {
      repId = Number(this.request.replacementAssetId);
      repName = this.request.replacementAssetName || this.replacementAssetName || undefined;
    }

    const remarks = this.adminRemarks || (isReplacement ? `Replacement request approved by IT Admin${repName ? ` (Allocated: ${repName})` : ''}` : 'Diagnostics and service approved by IT Admin');
    this.submitAdminStatusUpdate('Approved', remarks, false, repId, repName);
  }

  sendToRepairVendor() {
    if (this.request?.requestType === 'Replacement') {
      this.acknowledgeReplacementReceived();
      return;
    }
    this.submitAdminStatusUpdate('In Repair', this.adminRemarks || 'Hardware sent to authorized repair vendor for servicing');
  }

  acknowledgeReplacementReceived() {
    this.submitAdminStatusUpdate(
      'Replacement In Progress',
      this.adminRemarks || 'Old equipment received at IT Center. Replacement device being prepared for dispatch.'
    );
  }

  loadReplacementAssetsForDispatch() {
    this.assetService.assets$.subscribe((assets: AssetItem[]) => {
      const currentId = String(this.request?.assetId || this.data.asset?.id || '');
      const currentTypeClean = (this.request?.assetType || this.data.asset?.assetType || '').toLowerCase().trim();

      // Only devices matching the requested asset type and currently Available / Unassigned
      let available = (assets || []).filter(a =>
        String(a.id) !== currentId &&
        (currentTypeClean ? (a.assetType || '').toLowerCase().trim() === currentTypeClean : true) &&
        (a.status === 'Available' || a.assignedTo === 'Unassigned' || !a.employeeId || (a.status || '').toLowerCase().includes('available'))
      );

      // Fallback: If no assets explicitly marked Available, show company hardware stock of this asset type
      if (available.length === 0) {
        available = (assets || []).filter(a =>
          String(a.id) !== currentId &&
          (currentTypeClean ? (a.assetType || '').toLowerCase().trim() === currentTypeClean : true)
        );
      }

      this.availableReplacementAssets = available;
      this.matchingCategoryReplacementAssets = available;
      this.otherCategoryReplacementAssets = [];

      // 1. Resolve exact target ID from request.replacementAssetId
      let targetId: string | null = null;
      if (this.request?.replacementAssetId) {
        targetId = String(this.request.replacementAssetId);
      }

      // 2. Extract "Asset ID #X" or "#X" from description or replacementAssetName tag
      if (!targetId) {
        const desc = this.request?.description || this.replacementAssetName || '';
        const idMatch = desc.match(/(?:Asset ID #|#)(\d+)/i);
        if (idMatch && idMatch[1]) {
          targetId = idMatch[1];
        }
      }

      // 3. Match by targetId
      if (targetId) {
        const found = available.find(a => String(a.id) === targetId)
                   || (assets || []).find(a => String(a.id) === targetId);
        if (found) {
          this.selectedDispatchReplacementId = String(found.id);
          this.selectedDispatchReplacementAsset = found;
          return;
        }
      }

      // 4. Try matching by modelName or serialNumber from replacementAssetName
      const reqName = this.replacementAssetName;
      if (reqName) {
        const found = available.find(a =>
          (a.serialNumber && reqName.toLowerCase().includes(a.serialNumber.toLowerCase())) ||
          (a.modelName && reqName.toLowerCase().includes(a.modelName.toLowerCase()))
        );
        if (found) {
          this.selectedDispatchReplacementId = String(found.id);
          this.selectedDispatchReplacementAsset = found;
          return;
        }
      }

      // 5. Default to first matching category asset if nothing selected
      if (!this.selectedDispatchReplacementId && available.length > 0) {
        this.selectedDispatchReplacementId = String(available[0].id);
        this.selectedDispatchReplacementAsset = available[0];
      }
    });

    this.assetService.fetchAssetsFromApi();
  }

  onDispatchReplacementAssetChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    if (!val || val === 'PROCURED_DEVICE') {
      this.selectedDispatchReplacementAsset = null;
      return;
    }
    this.selectedDispatchReplacementAsset = this.availableReplacementAssets.find(a => String(a.id) === String(val)) || null;
  }

  getAssetTypeIcon(type?: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('laptop') || t.includes('macbook')) return 'laptop_mac';
    if (t.includes('monitor') || t.includes('display') || t.includes('screen')) return 'desktop_windows';
    if (t.includes('phone') || t.includes('mobile')) return 'smartphone';
    if (t.includes('tablet') || t.includes('ipad')) return 'tablet_mac';
    if (t.includes('keyboard')) return 'keyboard';
    if (t.includes('mouse')) return 'mouse';
    if (t.includes('headset') || t.includes('audio')) return 'headphones';
    return 'devices';
  }

  schedulePickup() {
    if (!this.adminTrackingNumber.trim()) {
      this.toastr.warning('Please enter a Pickup AWB / Request number.', 'AWB Required');
      return;
    }

    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'IT Admin';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload = {
      requestId: this.request.id,
      newStatus: 'Pickup Scheduled',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      courierPartner: this.adminCourierPartner,
      trackingNumber: this.adminTrackingNumber.trim(),
      adminRemarks: this.adminRemarks || `Reverse courier pickup scheduled via ${this.adminCourierPartner}`,
      remarks: `Company scheduled reverse pickup via ${this.adminCourierPartner}. Tracking / AWB: ${this.adminTrackingNumber}`
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.activeAdminAction = null;
        this.toastr.success(`Reverse courier pickup scheduled via ${this.adminCourierPartner}! Status set to Pickup Scheduled.`, 'Pickup Scheduled');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error scheduling pickup:', err);
        this.toastr.error('Failed to schedule pickup.', 'Error');
      }
    });
  }

  acknowledgeDeskHandoverReceive() {
    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'IT Admin';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const isReplacement = this.request?.requestType === 'Replacement';
    let repId: number | undefined = undefined;
    let repName: string | undefined = undefined;

    if (isReplacement && this.selectedDispatchReplacementAsset) {
      repId = parseInt(String(this.selectedDispatchReplacementAsset.id).replace(/\D/g, ''), 10) || undefined;
      repName = `${this.selectedDispatchReplacementAsset.modelName} (SN: ${this.selectedDispatchReplacementAsset.serialNumber || 'N/A'}, Asset ID #${this.selectedDispatchReplacementAsset.id})`;
    } else if (isReplacement && this.selectedDispatchReplacementId && this.selectedDispatchReplacementId !== 'PROCURED_DEVICE') {
      const chosen = this.availableReplacementAssets.find(a => String(a.id) === String(this.selectedDispatchReplacementId));
      if (chosen) {
        repId = parseInt(String(chosen.id).replace(/\D/g, ''), 10) || undefined;
        repName = `${chosen.modelName} (SN: ${chosen.serialNumber || 'N/A'}, Asset ID #${chosen.id})`;
      }
    } else if (isReplacement && this.request?.replacementAssetId) {
      repId = Number(this.request.replacementAssetId);
      repName = this.request.replacementAssetName || this.replacementAssetName || undefined;
    }

    const nextStatus = this.request?.requestType === 'Return' 
      ? 'Received by Admin' 
      : (isReplacement ? 'Replacement In Progress' : 'In Repair');

    const payload: any = {
      requestId: this.request.id,
      newStatus: nextStatus,
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      courierPartner: 'Direct IT Desk Handover',
      trackingNumber: this.adminTrackingNumber.trim() || 'DESK-HANDOVER',
      adminRemarks: this.adminRemarks || 'Device received directly from employee at IT Helpdesk.',
      remarks: isReplacement && repName
        ? `Old device received at IT Desk. Pre-allocated replacement device: ${repName}. Note: ${this.adminRemarks || 'In-Person Handover'}`
        : `Device handed over in person at IT Desk. Note: ${this.adminRemarks || 'In-Person Handover'}`,
      replacementAssetId: repId,
      replacementAssetName: repName
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.activeAdminAction = null;
        this.toastr.success(`Equipment received at IT Desk! Status moved to ${nextStatus}.`, 'Handover Acknowledged');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error acknowledging desk handover:', err);
        this.toastr.error('Failed to acknowledge desk handover.', 'Error');
      }
    });
  }

  confirmEmployeePickup() {
    this.isConfirmingPickup = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'Employee';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload = {
      requestId: this.request.id,
      newStatus: 'In Transit (Picked Up)',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      remarks: `Employee confirmed device handed over to ${this.request?.courierPartner || 'courier'} agent. Tracking: ${this.request?.trackingNumber || 'N/A'}`
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isConfirmingPickup = false;
        this.toastr.success('Courier pickup confirmed! Asset is now in transit to IT.', 'Pickup Confirmed');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isConfirmingPickup = false;
        console.error('Error confirming pickup:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to update pickup status.';
        this.toastr.error(msg, 'Error');
      }
    });
  }

  confirmEmployeeDeskHandoverReceived() {
    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'Employee';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const nextStatus = this.request?.requestType === 'Return' ? 'Received by Admin' : (this.request?.requestType === 'Replacement' ? 'Replacement In Progress' : 'In Repair');

    let repId: number | undefined = undefined;
    let repName: string | undefined = undefined;
    if (this.request?.requestType === 'Replacement') {
      if (this.request?.replacementAssetId) {
        repId = Number(this.request.replacementAssetId);
      } else {
        const idMatch = (this.request?.description || '').match(/(?:Asset ID #|#)(\d+)/i);
        if (idMatch && idMatch[1]) repId = Number(idMatch[1]);
      }
      repName = this.request?.replacementAssetName || this.replacementAssetName || undefined;
    }

    const payload: any = {
      requestId: this.request.id,
      newStatus: nextStatus,
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      courierPartner: 'Direct IT Desk Handover',
      trackingNumber: this.request?.trackingNumber || 'DESK-HANDOVER',
      remarks: `Employee confirmed equipment physically handed over and received at IT Helpdesk.`,
      replacementAssetId: repId,
      replacementAssetName: repName
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.toastr.success(`Equipment confirmed received at IT Desk! Status moved to ${nextStatus}.`, 'Handover Confirmed');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.refreshRequestDetails();
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error confirming desk handover receipt:', err);
        const msg = err?.error?.message || err?.error?.Message || err?.message || 'Failed to confirm desk handover receipt.';
        this.toastr.error(msg, 'Error');
      }
    });
  }

  confirmDispatch() {
    const isDirect = this.adminDispatchMode === 'Direct IT Desk Handover';
    if (!isDirect && !this.adminTrackingNumber.trim()) {
      this.toastr.warning('Please enter an AWB / Tracking number for courier parcel tracking.', 'AWB Required');
      return;
    }

    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'IT Admin';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const partner = isDirect ? 'Direct IT Desk Handover' : this.adminCourierPartner;
    const tracking = isDirect ? (this.adminTrackingNumber.trim() || 'DESK-HANDOVER') : this.adminTrackingNumber.trim();

    const isReplacement = this.request?.requestType === 'Replacement';
    let repId: number | undefined = undefined;
    let repName: string | undefined = undefined;

    if (isReplacement && this.selectedDispatchReplacementAsset) {
      repId = parseInt(String(this.selectedDispatchReplacementAsset.id).replace(/\D/g, ''), 10) || undefined;
      repName = `${this.selectedDispatchReplacementAsset.modelName} (SN: ${this.selectedDispatchReplacementAsset.serialNumber || 'N/A'}, Asset ID #${this.selectedDispatchReplacementAsset.id})`;
    } else if (isReplacement && this.selectedDispatchReplacementId && this.selectedDispatchReplacementId !== 'PROCURED_DEVICE') {
      const chosen = this.availableReplacementAssets.find(a => String(a.id) === String(this.selectedDispatchReplacementId));
      if (chosen) {
        repId = parseInt(String(chosen.id).replace(/\D/g, ''), 10) || undefined;
        repName = `${chosen.modelName} (SN: ${chosen.serialNumber || 'N/A'}, Asset ID #${chosen.id})`;
      }
    }

    if (isReplacement && !repId && this.request?.replacementAssetId) {
      repId = Number(this.request.replacementAssetId);
      repName = this.request.replacementAssetName || this.replacementAssetName || undefined;
    }

    const newStatus = isDirect ? 'Completed' : 'Dispatched';

    const payload: any = {
      requestId: this.request.id,
      newStatus: newStatus,
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      courierPartner: partner,
      trackingNumber: tracking,
      adminRemarks: this.adminRemarks || (isDirect ? (isReplacement ? `Replacement device (${repName || 'New Equipment'}) handed over directly at IT Desk` : 'Direct IT Desk Handover') : `Dispatched via ${partner}`),
      remarks: isDirect
        ? (isReplacement ? `Replacement device (${repName || 'New Equipment'}) handed over directly at IT desk. Service ticket completed.` : `Equipment handed over directly at IT desk. Note: ${this.adminRemarks || 'In-Person Handover'}`)
        : (isReplacement ? `Replacement device (${repName || 'New Equipment'}) dispatched via ${partner}. Tracking AWB: ${tracking}` : `Parcel dispatched via ${partner}. Tracking AWB: ${tracking}`),
      replacementAssetId: repId,
      replacementAssetName: repName
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.activeAdminAction = null;
        this.toastr.success(
          isDirect
            ? 'Replacement device handed over directly to employee! Asset assigned.'
            : `Equipment marked as Dispatched via ${partner}! Replacement asset assigned.`,
          'Handover Successful'
        );
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error dispatching parcel:', err);
        this.toastr.error('Failed to update dispatch status.', 'Error');
      }
    });
  }

  markAsDelivered() {
    this.submitAdminStatusUpdate('Delivered', 'Courier confirmed delivery to destination address.');
  }

  markReturnReceived() {
    this.submitAdminStatusUpdate('Received by Admin', 'Return package physically received by IT Admin. Ready for QA inspection.');
  }

  completeReturnInspection() {
    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'IT Admin';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const inspectionSummary = `QA Results: Physical Condition: ${this.qaPhysicalConditionOk ? 'PASSED' : 'DAMAGED'}, Accessories: ${this.qaAccessoriesReturned ? 'RETURNED' : 'MISSING'}, Power & Screen: ${this.qaPowerOnWorking ? 'WORKING' : 'FAULTY'}, Data Reset: ${this.qaDataWiped ? 'YES' : 'NO'}. Remarks: ${this.qaInspectionRemarks || 'All checks verified.'}`;

    const payload = {
      requestId: this.request.id,
      newStatus: 'Completed',
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      inspectionRemarks: inspectionSummary,
      adminRemarks: 'Return QA inspection completed. Asset reassigned to company Available pool.',
      remarks: 'Asset returned and verified. Status set to Available in inventory.'
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.activeAdminAction = null;
        this.toastr.success('Return inspection completed! Asset restored to Available inventory pool.', 'Return Completed');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error('Error completing return:', err);
        this.toastr.error('Failed to complete return QA inspection.', 'Error');
      }
    });
  }

  confirmReject() {
    if (!this.rejectionReason || !this.rejectionReason.trim()) {
      this.toastr.warning('Please provide a reason for rejecting the request.', 'Reason Required');
      return;
    }

    this.submitAdminStatusUpdate('Rejected', this.rejectionReason.trim(), true);
  }

  private submitAdminStatusUpdate(newStatus: string, remarks: string, closeOnFinish: boolean = false, repAssetId?: number, repAssetName?: string) {
    this.isProcessingAction = true;
    const currentUserName = localStorage.getItem('UserName') || localStorage.getItem('userName') || 'IT Admin';
    const currentEmpId = Number(localStorage.getItem('employeeId')) || undefined;

    const payload: any = {
      requestId: this.request.id,
      newStatus,
      actionByEmployeeId: currentEmpId,
      actionByName: currentUserName,
      adminRemarks: remarks,
      remarks,
      replacementAssetId: repAssetId,
      replacementAssetName: repAssetName
    };

    this.requestService.updateStatus(payload).subscribe({
      next: () => {
        this.isProcessingAction = false;
        this.activeAdminAction = null;
        this.toastr.success(`Ticket status updated to '${newStatus}'!`, 'Status Updated');
        this.assetService.fetchAssetsFromApi();
        this.notificationService.refreshNotifications();
        if (closeOnFinish) {
          this.dialogRef.close(true);
        } else {
          this.refreshRequestDetails();
        }
      },
      error: (err) => {
        this.isProcessingAction = false;
        console.error(`Error updating status to ${newStatus}:`, err);
        this.toastr.error('Failed to update ticket status.', 'Error');
      }
    });
  }

  openImageModal(imgUrl: string) {
    this.selectedImageModal = imgUrl;
  }

  closeImageModal() {
    this.selectedImageModal = null;
  }

  onClose() {
    this.dialogRef.close(false);
  }
}
