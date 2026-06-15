import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { generatePlanStreaming } from './src/api-handler';
import type { SSEEvent } from './src/types';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/generate-plan' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                let started = false;
                let aborted = false;
                const isAborted = () => aborted;
                req.on('close', () => {
                  aborted = true;
                });
                try {
                  const { prompt, agents, preferredFrontend, preferredBackend, preferredDatabase } = JSON.parse(body);
                  if (!prompt) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: "The architectural prompt is required." }));
                    return;
                  }

                  // Switch to SSE.
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'text/event-stream');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Connection', 'keep-alive');
                  started = true;

                  const emit = (event: SSEEvent) => {
                    if (aborted) return;
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                  };

                  await generatePlanStreaming(
                    { prompt, agents: agents || [], preferredFrontend, preferredBackend, preferredDatabase },
                    emit,
                    isAborted
                  );

                  if (!aborted) res.end();
                } catch (error: any) {
                  const message = error?.message || "Failed to process request";
                  if (!started) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: message }));
                  } else if (!aborted) {
                    res.write(`data: ${JSON.stringify({ type: "agent_error", agent: "ORCHESTRATOR", error: message })}\n\n`);
                    // Always terminate with a `done` frame (contract §3) — parity with server.ts.
                    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                    res.end();
                  }
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
