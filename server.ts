/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { generateArchitecturalPlan } from './src/api-handler.js';

dotenv.config();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '15mb' }));

  // Server-side API endpoint for generating full stack architectural plans
  app.post('/api/generate-plan', async (req, res) => {
    try {
      const { prompt, agents, preferredFrontend, preferredBackend, preferredDatabase } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "The architectural prompt is required." });
      }
      const plan = await generateArchitecturalPlan(
        prompt,
        agents || [],
        preferredFrontend,
        preferredBackend,
        preferredDatabase
      );
      return res.json(plan);
    } catch (error: any) {
      console.error("Architectural planner API error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate architecture plan" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets from the standard dist folder in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Fallback to client-side index.html for all other routing configurations
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    console.log("Client connected to /live WebSocket");
    try {
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY, 
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
      });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are an Elite Senior Full-Stack Architect. Discuss full-stack architecture, code concepts, and offer quick tips. Be conversational and highly intelligent.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              clientWs.send(JSON.stringify({ audio: audioData }), { binary: false });
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }), { binary: false });
            }
          },
        },
      });

      console.log("Connected to Gemini Live session");

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (err) {
          console.error("Error parsing/sending client audio", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client WebSocket disconnected");
        session.close();
      });
    } catch (err) {
      console.error("Failed to connect live session", err);
      clientWs.close();
    }
  });

  server.listen(port, () => {
    console.log(`Full-Stack Architect Server is running on port ${port}`);
  });
}

startServer();
