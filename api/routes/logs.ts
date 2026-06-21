import { Router } from 'express';
import { logService } from '../services/LogService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, project, from, to, limit, offset } = req.query;
    const result = await logService.getLogs({
      type: type as string | undefined,
      project: project as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string) : 10;
    const logs = await logService.getRecentLogs(count);
    res.json({ success: true, data: logs });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch recent logs' });
  }
});

export default router;
