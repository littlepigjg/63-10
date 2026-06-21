import { Router } from 'express';
import { clientService } from '../services/ClientService.js';
import { notifyService } from '../services/NotifyService.js';
import { logService } from '../services/LogService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const clients = await clientService.getAllClients();
    res.json({ success: true, data: clients });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, ip } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Client name is required' });
      return;
    }
    const client = await clientService.registerClient(name, ip || req.ip || 'unknown');
    res.status(201).json({ success: true, data: client });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to register client' });
  }
});

router.delete('/:clientId', async (req, res) => {
  try {
    const deleted = await clientService.deleteClient(req.params.clientId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete client' });
  }
});

router.post('/:clientId/heartbeat', async (req, res) => {
  try {
    const client = await clientService.heartbeat(req.params.clientId);
    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }
    res.json({ success: true, data: client });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update heartbeat' });
  }
});

router.post('/notify', async (req, res) => {
  try {
    const { targetClientId } = req.body;
    notifyService.notifyRefresh(targetClientId);
    await logService.addLog('notify', '', 'admin', '', '', `手动推送刷新通知${targetClientId ? `给 ${targetClientId}` : '给所有客户端'}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

export default router;
