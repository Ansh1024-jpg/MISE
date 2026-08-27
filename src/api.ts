import { Type } from '@google/genai';

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
  temperature: number = 1
) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema, temperature, stream: true })
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
