import { Router, type Request } from 'express';
import { configService } from '../services/ConfigService.js';
import { encryptionService } from '../services/EncryptionService.js';
import { clientService } from '../services/ClientService.js';
import type { AuditContext } from '../services/AuditLogService.js';

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

router.get('/status', async (req, res) => {
  try {
    const status = await encryptionService.getEncryptionStatus();
    res.json({ success: true, data: status });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get encryption status' });
  }
});

router.post('/:projectId/:envName/:key', async (req, res) => {
  try {
    const auditCtx = await buildAuditContext(req);
    const item = await configService.encryptConfig(
      req.params.projectId,
      req.params.envName,
      req.params.key,
      auditCtx
    );
    if (!item) {
      res.status(404).json({ success: false, error: 'Config not found or already encrypted' });
      return;
    }
    res.json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to encrypt config' });
  }
});

router.post('/:projectId/:envName/:key/decrypt', async (req, res) => {
  try {
    const auditCtx = await buildAuditContext(req);
    const item = await configService.decryptConfig(
      req.params.projectId,
      req.params.envName,
      req.params.key,
      auditCtx
    );
    if (!item) {
      res.status(404).json({ success: false, error: 'Config not found or not encrypted' });
      return;
    }
    res.json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to decrypt config' });
  }
});

export default router;
