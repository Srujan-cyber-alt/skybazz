import { getCandidatesForRequest } from '../services/discoveryService.js';

export async function getRequestCandidates(req, res) {
  try {
    const requestId = Number(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: 'invalid request id' });
    }

    const candidates = await getCandidatesForRequest(requestId);

    return res.json({
      requestId,
      candidates,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch candidates',
      details: err.message,
    });
  }
}