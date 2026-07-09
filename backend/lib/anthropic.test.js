import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendChatMessage } from './anthropic.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendChatMessage', () => {
  it('sends the expected request shape and extracts reply text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Hello there!' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendChatMessage({
      apiKey: 'test-key',
      system: 'be a tutor',
      messages: [{ role: 'user', content: 'what does this resistor do?' }],
    });

    expect(result).toEqual({ text: 'Hello there!', toolCalls: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('test-key');
    expect(options.headers['anthropic-version']).toBeTruthy();
    const body = JSON.parse(options.body);
    expect(body.system).toBe('be a tutor');
    expect(body.messages).toEqual([{ role: 'user', content: 'what does this resistor do?' }]);
    expect(body.model).toMatch(/claude/);
    expect(body.tools).toBeUndefined();
  });

  it('joins multiple text content blocks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'part one. ' }, { type: 'text', text: 'part two.' }] }),
    }));

    const result = await sendChatMessage({ apiKey: 'k', system: 's', messages: [] });
    expect(result.text).toBe('part one. part two.');
    expect(result.toolCalls).toEqual([]);
  });

  it('includes tools in the request body when provided, and extracts tool_use blocks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'Sure, adding it now.' },
          { type: 'tool_use', id: 'toolu_1', name: 'modify_circuit', input: { addWires: [{ fromHole: 'a-1', toHole: 'b-1' }] } },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const tools = [{ name: 'modify_circuit', description: 'd', input_schema: { type: 'object' } }];
    const result = await sendChatMessage({ apiKey: 'k', system: 's', messages: [], tools });

    expect(result.text).toBe('Sure, adding it now.');
    expect(result.toolCalls).toEqual([
      { name: 'modify_circuit', input: { addWires: [{ fromHole: 'a-1', toHole: 'b-1' }] } },
    ]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual(tools);
  });

  it('throws with the API-provided message on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid x-api-key' } }),
    }));

    await expect(sendChatMessage({ apiKey: 'bad', system: 's', messages: [] }))
      .rejects.toThrow('invalid x-api-key');
  });

  it('falls back to a status-based message if the error body has no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => null,
    }));

    await expect(sendChatMessage({ apiKey: 'k', system: 's', messages: [] }))
      .rejects.toThrow(/500/);
  });

  it('propagates a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(sendChatMessage({ apiKey: 'k', system: 's', messages: [] }))
      .rejects.toThrow('network down');
  });
});
