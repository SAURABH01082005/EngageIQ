// server/routes/aiQuery.js
const express = require('express');
const router = express.Router();
const { routeAIQuery, isFixedListedQuery } = require('../utils/aiAssistantRouter');

/**
 * POST /api/ai-query
 * Smart Router: Routes fixed queries to ML model & random queries to Gemini agent
 */
router.post('/ai-query', async (req, res) => {
  try {
    const { question, query, mode = 'auto', apiKey: bodyKey, geminiApiKey } = req.body || {};
    const rawQuestion = (question || query || req.query?.question || req.query?.query || '').trim();
    const userEmail = req.headers['x-user-email'] || req.body?.userEmail || req.query?.userEmail || req.headers['x-user-id'] || req.body?.userId || 'default_user';
    const platforms = req.query?.platforms ? req.query.platforms.split(',').filter(Boolean) : (req.body?.platforms || []);
    const apiKey = req.headers['x-gemini-api-key'] || geminiApiKey || bodyKey || '';

    if (!rawQuestion) {
      return res.status(400).json({ error: 'Please provide a valid question.' });
    }

    const result = await routeAIQuery(rawQuestion, platforms, mode, userEmail, apiKey);
    res.json(result);
  } catch (error) {
    console.error('AI Query Error:', error);
    res.status(500).json({
      error: 'Failed to process AI query.',
      response: 'An error occurred while processing the intelligence query. Please try again.'
    });
  }
});

/**
 * GET /api/ai-query/classify
 * Pre-classifies a query to show in UI whether it will use ML Engine or Gemini Agent
 */
router.get('/ai-query/classify', (req, res) => {
  const { question } = req.query;
  const classification = isFixedListedQuery(question || '');
  res.json({
    question: question || '',
    isFixed: classification.isFixed,
    targetEngine: classification.isFixed ? 'ml_model' : 'gemini_agent',
    patternId: classification.patternId
  });
});

module.exports = router;
