export type UserRole = 'admin' | 'owner' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: string;
  user: User;
  ipAddress?: string;
}

export interface Stall {
  id: number;
  ownerId: number;
  name: string;
  category: string | null;
  location: string | null;
  description: string | null;
  avgRating: number;
  reviewCount: number;
  isPopular: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface StallListResponse {
  status: string;
  meta: PaginationMeta;
  data: Stall[];
}

export interface SingleResponse<T> {
  status: string;
  data: T;
}

export interface StallQueryParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface StallPayload {
  name: string;
  category?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface ApiErrorResponse {
  status?: string;
  message?: string;
  errors?: unknown;
}

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  action: string;
  targetTable: string;
  targetId: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  pagination: AuditLogPagination;
}

export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  action?: string;
  targetTable?: string;
  targetId?: number;
  userId?: number;
  from?: string;
  to?: string;
}
