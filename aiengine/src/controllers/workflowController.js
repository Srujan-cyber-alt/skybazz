import {
    createWorkflow,
    getWorkflowById,
    applyEventToWorkflow
  } from '../workflow/workflowEngine.js';
  
  function createWorkflowHandler(req, res) {
    try {
      const workflow = createWorkflow(req.body || {});
  
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
  
  function getWorkflowHandler(req, res) {
    try {
      const workflow = getWorkflowById(req.params.id);
  
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
  
  function applyWorkflowEventHandler(req, res) {
    try {
      const updatedWorkflow = applyEventToWorkflow(req.params.id, req.body || {});
  
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