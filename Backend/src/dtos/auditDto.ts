export interface CreateAuditInput {
  userId: number;
  action: string;
  targetTable: string;
  targetId: number;
  metadata?: Record<string, unknown> | string | null;
}

export interface AuditResponseDto {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  action: string;
  targetTable: string;
  targetId: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditListResponseDto {
  items: AuditResponseDto[];
  pagination: AuditPaginationDto;
}
