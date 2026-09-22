export type AssetRequestType = 'Repair' | 'Replacement' | 'Return';
export type AssetRequestPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CreateAssetRequest {
  assetId: number;
  employeeId: number;
  requestType: AssetRequestType;
  priority?: AssetRequestPriority;
  reason: string;
  description?: string;
  imageUrls?: string;
}

export interface UpdateAssetRequestStatus {
  requestId: number;
  newStatus: string;
  actionByEmployeeId?: number;
  actionByName?: string;
  courierPartner?: string;
  trackingNumber?: string;
  remarks?: string;
  adminRemarks?: string;
  inspectionRemarks?: string;
}

export interface AssetRequestLog {
  id: number;
  fromStatus?: string;
  toStatus: string;
  actionByEmployeeId?: number;
  actionByName?: string;
  remarks?: string;
  createdDate: string;
}

export interface AssetRequestItem {
  id: number;
  assetId: number;
  assetName?: string;
  assetModel?: string;
  serialNumber?: string;
  assetType?: string;
  assetStatus?: string;
  employeeId: number;
  employeeName?: string;
  employeeEmail?: string;
  requestType: AssetRequestType;
  priority?: AssetRequestPriority;
  reason?: string;
  defectReason?: string;
  description?: string;
  imageUrls?: string;
  status: string;
  courierPartner?: string;
  trackingNumber?: string;
  dispatchedDate?: string;
  deliveredDate?: string;
  receivedDate?: string;
  adminRemarks?: string;
  remarks?: string;
  inspectionRemarks?: string;
  createdDate?: string;
  updatedDate?: string;
  logs: AssetRequestLog[];
}
