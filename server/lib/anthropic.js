const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// Thin wrapper around the Anthropic Messages API using the global fetch
// (Node 24+, no extra dependency). Buffered, not streamed - matches every
// other endpoint on this server.
export async function sendChatMessage({ apiKey, system, messages }) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || `Anthropic API request failed with status ${res.status}`;
    throw new Error(message);
  }

  return (data?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}
