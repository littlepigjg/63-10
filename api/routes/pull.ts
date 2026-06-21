import { Router } from 'express';
import { configService } from '../services/ConfigService.js';
import { clientService } from '../services/ClientService.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { project, environment, token } = req.body;
    if (!project || !environment) {
      res.status(400).json({ success: false, error: 'Project and environment are required' });
      return;
    }

    let clientName = 'anonymous';
    let clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (token) {
      const client = await clientService.validateToken(token);
      if (client) {
        clientName = client.name;
        clientIp = client.ip;
      }
    }

    const result = await configService.pullConfigs(project, environment, clientIp, clientName);
    if (!result) {
      res.status(404).json({ success: false, error: 'Project or environment not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to pull configs' });
  }
});

router.get('/:project/:env', async (req, res) => {
  try {
    const token = req.query.token as string;
    let clientName = 'anonymous';
    let clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (token) {
      const client = await clientService.validateToken(token);
      if (client) {
        clientName = client.name;
        clientIp = client.ip;
      }
    }

    const result = await configService.pullConfigs(req.params.project, req.params.env, clientIp, clientName);
    if (!result) {
      res.status(404).json({ success: false, error: 'Project or environment not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to pull configs' });
  }
});

export default router;
