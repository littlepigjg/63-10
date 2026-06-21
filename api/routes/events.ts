import { Router } from 'express';
import { notifyService } from '../services/NotifyService.js';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  const clientId = crypto.randomUUID();
  notifyService.addClient(clientId, res);
});

export default router;
