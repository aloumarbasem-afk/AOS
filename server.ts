/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArchitecturalPlan } from './src/api-handler.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// Serve static assets from the standard dist folder in production
app.use(express.static(path.resolve(__dirname, 'dist')));

// Fallback to client-side index.html for all other routing configurations
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Production Full-Stack Architect Server is running on port ${port}`);
});
