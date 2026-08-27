import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// __PROD__ is injected by esbuild at build time (see the "build" script).
// Under `npm run dev` (tsx) it is undefined, so we fall back to NODE_ENV.
declare const __PROD__: boolean;
const isProd =
  typeof __PROD__ !== 'undefined' ? __PROD__ : process.env.NODE_ENV === 'production';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set. Set it in your host\'s environment settings.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// --- Minimal abuse guard -------------------------------------------------
// Once this is on a public URL, /api/gemini is an open proxy to your billed
// Gemini key. This caps requests per IP per hour. Tune with RATE_LIMIT_PER_HOUR.
const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR || 60);
const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + 3_600_000 });
    return next();
  }
  if (entry.count >= LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }
  entry.count++;
  next();
}
// -------------------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => res.status(200).send('ok'));

  app.post('/api/gemini', rateLimit, async (req, res) => {
    try {
      const { prompt, schema, temperature = 1, stream = false } = req.body;

      const config: any = {
        systemInstruction: "You are a culinary R&D partner working under a hard pantry constraint. You reason explicitly about flavour chemistry, technique, and feasibility before recommending. You never suggest an ingredient outside the supplied pantry. You prefer one surprising, defensible move over many gimmicks.",
        temperature
      };

      if (schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
      }

      if (stream) {
        const response = await ai.models.generateContentStream({
          model: MODEL,
          contents: prompt,
          config
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        // Stops nginx-style reverse proxies (Render, Koyeb, some CDNs) from
        // buffering the SSE stream and killing token-by-token output.
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        for await (const chunk of response) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        res.end();
      } else {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config
        });

        res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      if (res.headersSent) return res.end();
      res.status(500).json({ error: error.message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Client build lives in dist/client; the server bundle sits in dist/ and is
    // deliberately NOT inside the static root.
    const distPath = path.join(__dirname, 'client');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
