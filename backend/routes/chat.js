import { Router } from 'express';
import { sendChatMessage } from '../lib/anthropic.js';
import { TUTOR_SYSTEM_PROMPT } from '../lib/tutorPersona.js';
import { CIRCUIT_TOOLS } from '../lib/circuitTools.js';
import { requireAuth } from '../lib/requireAuth.js';
import { createRateLimiter } from '../lib/rateLimit.js';

export const chatRouter = Router();

const chatRateLimiter = createRateLimiter({
  windowMinutes: 15,
  max: 30,
  message: 'Too many chat requests - try again in a few minutes.',
});

function isValidMessage(m) {
  return !!m
    && (m.role === 'user' || m.role === 'assistant')
    && typeof m.content === 'string'
    && m.content.trim() !== '';
}

// Gated: this calls the paid Anthropic API on arbitrary user input, so it
// requires sign-in and is rate-limited per account. Middleware is attached
// directly to this route, not via chatRouter.use(...) - see the comment in
// routes/compile.js for why (this router is mounted at the app root
// alongside toolchainStatusRouter).
chatRouter.post('/chat', requireAuth, chatRateLimiter, async (req, res) => {
  const { messages, circuitContext } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isValidMessage)) {
    return res.status(400).json({
      success: false,
      error: 'invalid-request',
      message: 'messages must be a non-empty array of { role: "user"|"assistant", content: string }',
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'missing-api-key',
      message: 'ANTHROPIC_API_KEY is not set. Add it to a .env file at the repo root and restart the dev server.',
    });
  }

  const system = typeof circuitContext === 'string' && circuitContext.trim() !== ''
    ? `${TUTOR_SYSTEM_PROMPT}\n\n---CURRENT CIRCUIT STATE---\n${circuitContext}`
    : TUTOR_SYSTEM_PROMPT;

  try {
    const { text, toolCalls } = await sendChatMessage({ apiKey, system, messages, tools: CIRCUIT_TOOLS });
    res.status(200).json({ success: true, reply: text, actions: toolCalls });
  } catch (err) {
    console.error('Unexpected chat server error:', err);
    res.status(500).json({ success: false, error: 'internal-error', message: 'The AI tutor hit an unexpected error.' });
  }
});
