import { Router } from 'express';
import { configService } from '../services/ConfigService.js';
import { encryptionService } from '../services/EncryptionService.js';

const router = Router();

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
    const item = await configService.encryptConfig(req.params.projectId, req.params.envName, req.params.key);
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
    const item = await configService.decryptConfig(req.params.projectId, req.params.envName, req.params.key);
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
