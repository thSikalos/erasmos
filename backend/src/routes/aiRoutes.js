const express = require('express');

const router = express.Router();

// POST /api/ai/claude
router.post('/claude', async (req, res) => {
  try {
    const { prompt, model, max_tokens } = req.body || {};

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY in environment' });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "prompt"' });
    }

    // Dynamic import to support CommonJS project layout
    const { default: Anthropic } = await import('@anthropic-ai/sdk');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: model || 'claude-3-5-sonnet-20240620',
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 512,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = Array.isArray(response?.content) ? response.content : [];
    const firstTextBlock = content.find((block) => block.type === 'text');
    const text = firstTextBlock ? firstTextBlock.text : '';

    return res.json({ text, raw: response });
  } catch (error) {
    console.error('Claude route error:', error);
    return res.status(500).json({ error: 'Claude request failed', details: error?.message || String(error) });
  }
});

module.exports = router;


