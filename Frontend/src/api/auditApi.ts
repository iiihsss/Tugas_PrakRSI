import { axiosInstance } from './axiosInstance';
import type {
  AuditLog,
  AuditLogListResponse,
  AuditLogQueryParams,
  SingleResponse,
} from '../types';

export const auditApi = {
  getAll: async (params: AuditLogQueryParams): Promise<AuditLogListResponse> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );
    const response = await axiosInstance.get<SingleResponse<AuditLogListResponse>>(
      '/api/audit-logs',
      { params: cleanParams },
    );
    return response.data.data;
  },

  getById: async (id: number): Promise<AuditLog> => {
    const response = await axiosInstance.get<SingleResponse<AuditLog>>(
      `/api/audit-logs/${id}`,
    );
    return response.data.data;
  },
};
