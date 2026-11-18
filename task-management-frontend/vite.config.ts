/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const apiTarget = process.env.LAYERS_API ?? 'http://localhost:5080';

/**
 * Server-side Vite middleware for /api/ai-chat.
 * Reads GEMINI_API_KEY strictly on the Node server (from parent solution .env or local .env — NEVER VITE_*).
 */
function layersServerAiPlugin(): Plugin {
  let apiKey = '';
  let model = 'gemini-2.5-flash';

  const attach = (middlewares: { use: (route: string, fn: (req: any, res: any) => void) => void }) => {
    middlewares.use('/api/ai-chat', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }
      if (!apiKey) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ reply: null, engine: 'hybrid-rag-local' }));
        return;
      }

      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 32768) break;
      }
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        body = {};
      }

      const message = String(body.message ?? '').trim().slice(0, 2000);
      const summaryContext = String(body.summaryContext ?? '').slice(0, 4000);

      const encKey = encodeURIComponent(apiKey);
      const vertexUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encKey}`;
      const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encKey}`;
      const endpoints = apiKey.startsWith('AQ.') ? [vertexUrl, studioUrl] : [studioUrl, vertexUrl];

      const payload = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `You are Layers AI Sprint Copilot inside an Agile Mini-Jira workspace.\nWorkspace Tool Output: ${summaryContext}\nUser Message: ${message}\nWrite a crisp, high-signal 2-sentence engineering response in the same language as the user (Vietnamese or English). Do not use markdown tables; the interactive UI widget renders below your text.`,
          }],
        }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 260 },
      });

      for (const url of endpoints) {
        try {
          const upstream = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            signal: AbortSignal.timeout(18000),
          });
          if (!upstream.ok) continue;
          const json: any = await upstream.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply: text, engine: 'Gemini 2.5 + Hybrid Tool Engine' }));
            return;
          }
        } catch {
          /* try fallback endpoint */
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ reply: null, engine: 'Hybrid BM25 + Agile Tool Engine' }));
    });
  };

  return {
    name: 'layers-server-ai-proxy',
    configResolved(config) {
      const localEnv = loadEnv(config.mode, process.cwd(), '');
      const rootEnv = loadEnv(config.mode, path.resolve(process.cwd(), '..'), '');
      apiKey = (localEnv.GEMINI_API_KEY || rootEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
      model = (localEnv.GEMINI_MODEL || rootEnv.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    },
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), layersServerAiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin proxy: the httpOnly refresh cookie (path /api/v1/auth) just works in dev.
    proxy: { '/api/v1': { target: apiTarget, changeOrigin: true } },
  },
  preview: { port: 4173, proxy: { '/api/v1': { target: apiTarget, changeOrigin: true } } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@dnd-kit')) return 'dnd';
            if (id.includes('@tanstack') || id.includes('react-router')) return 'routing-query';
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'text', 'json-summary'],
    },
  },
});
