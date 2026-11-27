import type { Request, Response } from 'express';
import { AuditService } from '../services/auditService.ts';
import { getValidated } from '../middlewares/validate.ts';
import type { AuditQuery } from '../schemas/auditSchema.ts';
import type { IdParam } from '../schemas/stallSchema.ts';

export class AuditController {
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  getAuditLogs = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidated<AuditQuery>(res, 'query');
    const data = await this.auditService.getAuditLogs(query);
    res.status(200).json({ status: 'success', data });
  };

  getAuditLogById = async (_req: Request, res: Response): Promise<void> => {
    const { id } = getValidated<IdParam>(res, 'params');
    const data = await this.auditService.getAuditLogById(id);
    res.status(200).json({ status: 'success', data });
  };
}
