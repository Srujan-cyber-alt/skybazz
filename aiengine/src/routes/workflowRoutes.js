import express from 'express';
import {
  createWorkflowHandler,
  getWorkflowHandler,
  applyWorkflowEventHandler
} from '../controllers/workflowController.js';

const router = express.Router();

router.post('/', createWorkflowHandler);
router.get('/:id', getWorkflowHandler);
router.post('/:id/events', applyWorkflowEventHandler);

export default router;