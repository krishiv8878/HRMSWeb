export type AssetStatus = 'Active' | 'Available' | 'In Repair' | 'Inactive' | 'Deactivated';
export type AssetType = 'Laptop' | 'Monitor' | 'Tablet' | 'Furniture' | 'Peripherals';

export interface AssetItem {
  id: string;             // e.g. AST-1042
  modelName: string;      // e.g. MacBook Pro 16"
  specifications: string; // e.g. Laptop • 2023 M2 Max
  assetType: AssetType;
  assignedTo?: string;    // e.g. Sarah Jenkins
  assignedAvatar?: string;
  assignedInitials?: string;
  location: string;       // e.g. NY Office - Floor 4
  status: AssetStatus;
  lastAudit: string;      // e.g. Oct 12, 2023
  isOverdue?: boolean;
  isActive?: boolean;
  employeeId?: number;
}

export interface AssetMetricCard {
  id: string;
  title: string;
  value: number;
  subtitle: string;
  iconName: string;
  theme: 'blue' | 'indigo' | 'rose' | 'emerald';
  isWarning?: boolean;
  isPositive?: boolean;
}
