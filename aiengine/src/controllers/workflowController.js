import {
    createWorkflow,
    getWorkflowById,
    applyEventToWorkflow
  } from '../workflow/workflowEngine.js';
  
  async function createWorkflowHandler(req, res) {
    try {
      const workflow = await createWorkflow(req.body || {});
  
      return res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (error) {
      const statusCode = error.message === 'Workflow not found' ? 404 : 400;
  
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async function getWorkflowHandler(req, res) {
    try {
      const workflow = await getWorkflowById(req.params.id);
  
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }
  
      return res.status(200).json({
        success: true,
        data: workflow
      });
    } catch (error) {
      const statusCode = error.message === 'Workflow not found' ? 404 : 400;
  
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async function applyWorkflowEventHandler(req, res) {
    try {
      const updatedWorkflow = await applyEventToWorkflow(req.params.id, req.body || {});
  
      return res.status(200).json({
        success: true,
        data: updatedWorkflow
      });
    } catch (error) {
      const statusCode = error.message === 'Workflow not found' ? 404 : 400;
  
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
  
  export {
    createWorkflowHandler,
    getWorkflowHandler,
    applyWorkflowEventHandler
  };