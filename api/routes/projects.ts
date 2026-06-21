import { Router } from 'express';
import { configService } from '../services/ConfigService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const projects = await configService.getAllProjects();
    res.json({ success: true, data: projects });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const project = await configService.getProjectById(req.params.projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    res.json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Project name is required' });
      return;
    }
    const project = await configService.createProject(name, description || '');
    res.status(201).json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

router.put('/:projectId', async (req, res) => {
  try {
    const project = await configService.updateProject(req.params.projectId, req.body);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    res.json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

router.delete('/:projectId', async (req, res) => {
  try {
    const deleted = await configService.deleteProject(req.params.projectId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
