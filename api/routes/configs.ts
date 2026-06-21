import { Router } from 'express';
import { configService } from '../services/ConfigService.js';
import { clientService } from '../services/ClientService.js';
import type { AuditContext } from '../services/AuditLogService.js';
import type { Request } from 'express';

const router = Router();

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return (req.headers['x-client-token'] as string) || '';
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '';
}

async function buildAuditContext(req: Request): Promise<AuditContext> {
  const token = extractToken(req);
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || '';

  if (token) {
    const client = await clientService.validateToken(token);
    if (client) {
      return {
        operatorId: client.id,
        operatorName: client.name,
        operatorToken: token,
        clientIp,
        userAgent,
      };
    }
  }

  return {
    operatorId: 'admin',
    operatorName: 'admin',
    operatorToken: token || 'admin_token',
    clientIp,
    userAgent,
  };
}

router.get('/:projectId/envs/:envName', async (req, res) => {
  try {
    const configs = await configService.getEnvironmentConfigs(req.params.projectId, req.params.envName);
    if (!configs) {
      res.status(404).json({ success: false, error: 'Environment not found' });
      return;
    }
    res.json({ success: true, data: configs });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch configs' });
  }
});

router.post('/:projectId/envs/:envName', async (req, res) => {
  try {
    const { key, value, description, encrypted } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: 'Key and value are required' });
      return;
    }
    const auditCtx = await buildAuditContext(req);
    const item = await configService.addConfigItem(
      req.params.projectId,
      req.params.envName,
      key,
      value,
      description || '',
      encrypted || false,
      auditCtx
    );
    if (!item) {
      res.status(409).json({ success: false, error: 'Config key already exists' });
      return;
    }
    res.status(201).json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to add config' });
  }
});

router.put('/:projectId/envs/:envName/:key', async (req, res) => {
  try {
    const auditCtx = await buildAuditContext(req);
    const item = await configService.updateConfigItem(
      req.params.projectId,
      req.params.envName,
      req.params.key,
      req.body,
      auditCtx
    );
    if (!item) {
      res.status(404).json({ success: false, error: 'Config not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update config' });
  }
});

router.delete('/:projectId/envs/:envName/:key', async (req, res) => {
  try {
    const auditCtx = await buildAuditContext(req);
    const deleted = await configService.deleteConfigItem(
      req.params.projectId,
      req.params.envName,
      req.params.key,
      auditCtx
    );
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Config not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete config' });
  }
});

export default router;
