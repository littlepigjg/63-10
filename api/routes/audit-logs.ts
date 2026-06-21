import { Router } from 'express';
import { auditLogService } from '../services/AuditLogService.js';
import type { AuditOperationType } from '../../shared/types.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const {
      operationType,
      projectId,
      environment,
      configKey,
      operatorId,
      from,
      to,
      limit,
      offset,
    } = req.query;

    const result = await auditLogService.getLogs({
      operationType: (operationType as AuditOperationType | '') || undefined,
      projectId: projectId as string | undefined,
      environment: environment as string | undefined,
      configKey: configKey as string | undefined,
      operatorId: operatorId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string) : 10;
    const logs = await auditLogService.getRecentLogs(count);
    res.json({ success: true, data: logs });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch recent audit logs' });
  }
});

export default router;
