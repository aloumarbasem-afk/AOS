/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePlanStreaming } from './src/api-handler.js';
import type { SSEEvent } from './src/types.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side API endpoint: streams a sequential 4-agent architectural plan
// to the browser over Server-Sent Events (SSE).
app.post('/api/generate-plan', async (req, res) => {
  const { prompt, agents, preferredFrontend, preferredBackend, preferredDatabase } = req.body;

  // Guard BEFORE switching to SSE headers, so we can still send a JSON 400.
  if (!prompt) {
    return res.status(400).json({ error: "The architectural prompt is required." });
  }

  // Switch into SSE mode.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders?.();

  // Track client disconnects so we never write to a dead socket.
  let aborted = false;
  const isAborted = () => aborted;
  req.on('close', () => {
    aborted = true;
  });

  const emit = (event: SSEEvent) => {
    if (aborted) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await generatePlanStreaming(
      {
        prompt,
        agents: agents || [],
        preferredFrontend,
        preferredBackend,
        preferredDatabase,
      },
      emit,
      isAborted
    );
  } catch (error: any) {
    // Unexpected failure (e.g. missing API key) after SSE headers were sent:
    // surface it as an error frame rather than throwing.
    console.error("Architectural planner streaming error:", error);
    if (!aborted) {
      const message = error?.message || "Failed to generate architecture plan";
      res.write(`data: ${JSON.stringify({ type: "agent_error", agent: "ORCHESTRATOR", error: message })}\n\n`);
      // Always terminate the stream with a `done` frame (contract §3). The
      // success path emits this inside generatePlanStreaming; the pre-loop
      // throw path (e.g. missing GEMINI_API_KEY) never reached it, so emit here.
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    }
  } finally {
    if (!aborted) {
      res.end();
    }
  }
});

// Serve static assets from the standard dist folder in production
app.use(express.static(path.resolve(__dirname, 'dist')));

// Fallback to client-side index.html for all other routing configurations
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Production Full-Stack Architect Server is running on port ${port}`);
});
