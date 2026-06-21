import { Router } from 'express';
import { configService } from '../services/ConfigService.js';

const router = Router();

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
    const item = await configService.addConfigItem(req.params.projectId, req.params.envName, key, value, description || '', encrypted || false);
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
    const item = await configService.updateConfigItem(req.params.projectId, req.params.envName, req.params.key, req.body);
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
    const deleted = await configService.deleteConfigItem(req.params.projectId, req.params.envName, req.params.key);
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
