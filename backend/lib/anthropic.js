const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// Thin wrapper around the Anthropic Messages API using the global fetch
// (Node 24+, no extra dependency). Buffered, not streamed - matches every
// other endpoint on this server. `tools`, when passed, lets the model
// respond with structured `tool_use` blocks alongside its text (see
// server/lib/circuitTools.js) - this is a single turn, not an agentic loop:
// we never send a tool_result back for a follow-up completion.
export async function sendChatMessage({ apiKey, system, messages, tools }) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: MAX_TOKENS, system, messages,
      ...(tools ? { tools } : {}),
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || `Anthropic API request failed with status ${res.status}`;
    throw new Error(message);
  }

  const content = data?.content ?? [];
  const text = content.filter((block) => block.type === 'text').map((block) => block.text).join('');
  const toolCalls = content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({ name: block.name, input: block.input }));

  return { text, toolCalls };
}
