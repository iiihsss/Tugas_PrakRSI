import { Router } from 'express';
import { AuditController } from '../controllers/auditController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { authorize } from '../middlewares/authorize.ts';
import { validate } from '../middlewares/validate.ts';
import { auditQuerySchema } from '../schemas/auditSchema.ts';
import { idParamSchema } from '../schemas/stallSchema.ts';

const auditRouter = Router();
const auditController = new AuditController();

auditRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(auditQuerySchema, 'query'),
  (req, res) => {
    // #swagger.responses[200] = { description: 'Daftar audit log' }
    return auditController.getAuditLogs(req, res);
  },
);

auditRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(idParamSchema, 'params'),
  (req, res) => {
    // #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
    // #swagger.responses[200] = { description: 'Detail audit log' }
    // #swagger.responses[404] = { description: 'Audit log tidak ditemukan' }
    return auditController.getAuditLogById(req, res);
  },
);

export { auditRouter };
