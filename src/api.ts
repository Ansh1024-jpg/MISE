/** Pull the server's JSON error message out of a failed response. */
async function describeFailure(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error ? `: ${body.error}` : '';
  } catch {
    // Non-JSON body (proxy error page, gateway timeout). statusText is all we get.
  }
  if (res.status === 429) {
    return `Rate limit reached (429)${detail}. Raise RATE_LIMIT_PER_HOUR on the server, or wait for the window to reset.`;
  }
  return `Request failed: ${res.status} ${res.statusText}${detail}`;
}

export async function callGemini(
  prompt: string,
  schema?: any,
  temperature: number = 1
) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema, temperature })
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res));
  }
  const data = await res.json();

  if (schema) {
    try {
      const cleanText = data.text.replace(/^```json\n?/, '').replace(/```\n?$/, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", data.text);
      throw e;
    }
  }

  return data.text;
}

export async function* callGeminiStream(
  prompt: string,
  schema?: any,
  temperature: number = 1,
  signal?: AbortSignal
) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema, temperature, stream: true }),
    signal
  });

  if (!res.ok) {
    throw new Error(await describeFailure(res));
  }
  if (!res.body) {
    throw new Error('Response had no readable body — the stream was likely stripped in transit.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        yield data.text || '';
      }
    }
  }
}

const NO_STREAM_KEY = 'mise_no_stream';

/** True once streaming has been proven not to work on this browser/network. */
export function streamingDisabled(): boolean {
  try {
    return localStorage.getItem(NO_STREAM_KEY) === '1';
  } catch {
    return false;
  }
}

export function setStreamingDisabled(v: boolean) {
  try {
    if (v) localStorage.setItem(NO_STREAM_KEY, '1');
    else localStorage.removeItem(NO_STREAM_KEY);
  } catch {
    // Private mode or storage disabled. Nothing to remember; just retry streaming.
  }
}

/**
 * Stream if the network allows it, otherwise fall back to a single request.
 *
 * SSL-inspecting corporate proxies routinely buffer or drop `text/event-stream`,
 * which leaves the connection open with nothing arriving. If no chunk lands
 * within `firstChunkTimeoutMs`, abort and take the non-streaming path.
 *
 * The outcome is remembered, so a network that has already failed once does not
 * pay the timeout again on every subsequent generation.
 */
export async function callGeminiStreamWithFallback(
  prompt: string,
  schema: any,
  temperature: number,
  onPartial: (parsed: any) => void,
  firstChunkTimeoutMs = 10000
): Promise<{ result: any; usedFallback: boolean }> {
  const clean = (t: string) =>
    t.replace(/^```json\n?/, '').replace(/```\n?$/, '').trim();

  if (streamingDisabled()) {
    const result = await callGemini(prompt, schema, temperature);
    return { result, usedFallback: true };
  }

  const controller = new AbortController();
  let sawChunk = false;
  const timer = setTimeout(() => {
    if (!sawChunk) controller.abort();
  }, firstChunkTimeoutMs);

  let fullText = '';

  try {
    for await (const chunk of callGeminiStream(prompt, schema, temperature, controller.signal)) {
      if (!sawChunk) {
        sawChunk = true;
        clearTimeout(timer);
      }
      fullText += chunk;
      try {
        onPartial(JSON.parse(clean(fullText)));
      } catch {
        // Incomplete JSON. Keep buffering.
      }
    }
  } catch (e) {
    console.warn('Streaming failed, falling back to a single request.', e);
  } finally {
    clearTimeout(timer);
  }

  try {
    const parsed = JSON.parse(clean(fullText));
    return { result: parsed, usedFallback: false };
  } catch {
    // Stream was empty, truncated, or mangled in transit.
  }

  // Streaming produced nothing usable. Remember that and stop retrying it.
  setStreamingDisabled(true);
  const result = await callGemini(prompt, schema, temperature);
  return { result, usedFallback: true };
}
