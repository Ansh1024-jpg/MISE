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
    throw new Error(`API Error: ${res.statusText}`);
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

  if (!res.ok || !res.body) {
    throw new Error(`API Error: ${res.statusText}`);
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

/**
 * Stream if the network allows it, otherwise fall back to a single request.
 *
 * Corporate proxies and SSL-inspecting middleboxes routinely buffer or drop
 * `text/event-stream`, which leaves the stream open with nothing arriving.
 * If no chunk lands within `firstChunkTimeoutMs`, abort and take the
 * non-streaming path so the step still completes.
 */
export async function callGeminiStreamWithFallback(
  prompt: string,
  schema: any,
  temperature: number,
  onPartial: (parsed: any) => void,
  firstChunkTimeoutMs = 20000
): Promise<{ result: any; usedFallback: boolean }> {
  const clean = (t: string) =>
    t.replace(/^```json\n?/, '').replace(/```\n?$/, '').trim();

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

  const result = await callGemini(prompt, schema, temperature);
  return { result, usedFallback: true };
}
