export type AccessLevel = 'Restricted' | 'Public' | 'Private';
export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'zip' | 'png' | 'jpg' | 'jpeg' | string;

export interface DocumentCategory {
  id: string;
  title: string;
  description: string;
  fileCount: number;
  iconName: string;
  theme: 'blue' | 'emerald' | 'indigo' | 'rose';
}

export type DocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DocumentItem {
  id: string;
  name: string;
  fileType: FileType;
  category: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerInitials?: string;
  accessLevel: AccessLevel;
  lastModified: string;
  fileSize?: string;
  file?: File;
  fileUrl?: string;
  isActive?: boolean;
  status?: DocumentStatus;
  rejectionReason?: string;
  actionBy?: number;
  actionDate?: string;
  employeeId?: number;
}
