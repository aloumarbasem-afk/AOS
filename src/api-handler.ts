import { GoogleGenAI, Type } from "@google/genai";
import {
  ArchitecturalPlanResponse,
  AgentName,
  SSEEvent,
} from "./types";

const MODEL_ID = "gemini-3.5-flash";

export interface PlanArgs {
  prompt: string;
  agents: string[];
  preferredFrontend?: string;
  preferredBackend?: string;
  preferredDatabase?: string;
}

// ---------------------------------------------------------------------------
// Per-agent response schemas. Each agent owns ONLY the sections it writes.
// Derived from the original monolithic schema + the TypeScript interfaces in
// types.ts. NOTE: cicdStrategy is rebuilt to match CicdPipelineStrategy (the
// old {provider, stages:[{name, commands}]} shape was wrong and the UI never
// rendered it).
// ---------------------------------------------------------------------------

const stackDetailSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    version: { type: Type.STRING },
    reason: { type: Type.STRING },
    advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["name", "version", "reason", "advantages"],
};

const orchestratorSchema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING },
    oneLiner: { type: Type.STRING },
    scope: { type: Type.ARRAY, items: { type: Type.STRING } },
    stack: {
      type: Type.OBJECT,
      properties: {
        frontend: stackDetailSchema,
        backend: stackDetailSchema,
        database: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            version: { type: Type.STRING },
            reason: { type: Type.STRING },
            advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
            schemaPhilosophy: { type: Type.STRING },
          },
          required: ["name", "version", "reason", "advantages", "schemaPhilosophy"],
        },
        infraAndCaching: {
          type: Type.OBJECT,
          properties: {
            hosting: { type: Type.STRING },
            cacheOrQueue: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["hosting", "reason"],
        },
      },
      required: ["frontend", "backend", "database", "infraAndCaching"],
    },
    agentPlan: {
      type: Type.OBJECT,
      properties: {
        agentName: { type: Type.STRING },
        setupPrerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        phases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              commandToRun: { type: Type.STRING },
            },
            required: ["title", "description", "steps"],
          },
        },
        agentSpecificTips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["agentName", "setupPrerequisites", "phases", "agentSpecificTips"],
    },
  },
  required: ["projectName", "oneLiner", "scope", "stack", "agentPlan"],
};

const designerSchema = {
  type: Type.OBJECT,
  properties: {
    frontendGuide: {
      type: Type.OBJECT,
      properties: {
        stylingLibrary: { type: Type.STRING },
        performanceTricks: { type: Type.ARRAY, items: { type: Type.STRING } },
        modularPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["stylingLibrary", "performanceTricks", "modularPatterns"],
    },
  },
  required: ["frontendGuide"],
};

const coderSchema = {
  type: Type.OBJECT,
  properties: {
    tree: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          type: { type: Type.STRING }, // "file" | "directory"
          shortLabel: { type: Type.STRING },
        },
        required: ["path", "type"],
      },
    },
    boilerplates: {
      type: Type.OBJECT,
      description:
        "Key-value map of exact file paths from 'tree' to complete, production-ready, highly professional boilerplate code contents.",
    },
    authStrategy: {
      type: Type.OBJECT,
      properties: {
        method: { type: Type.STRING },
        passwordManagement: { type: Type.STRING },
        rbac: { type: Type.STRING },
        boilerplatePath: { type: Type.STRING },
        boilerplateCode: { type: Type.STRING },
      },
      required: ["method", "passwordManagement", "rbac", "boilerplatePath", "boilerplateCode"],
    },
  },
  required: ["tree", "boilerplates", "authStrategy"],
};

const testerSchema = {
  type: Type.OBJECT,
  properties: {
    testingStrategy: {
      type: Type.OBJECT,
      properties: {
        testingFramework: { type: Type.STRING },
        command: { type: Type.STRING },
        configBoilerplatePath: { type: Type.STRING },
        configBoilerplate: { type: Type.STRING },
        sampleTestPath: { type: Type.STRING },
        sampleTestCode: { type: Type.STRING },
      },
      required: [
        "testingFramework",
        "command",
        "configBoilerplatePath",
        "configBoilerplate",
        "sampleTestPath",
        "sampleTestCode",
      ],
    },
    cicdStrategy: {
      type: Type.OBJECT,
      properties: {
        toolName: { type: Type.STRING },
        reason: { type: Type.STRING },
        configFileTemplatePath: { type: Type.STRING },
        configFileContent: { type: Type.STRING },
        stages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              commandsOrActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["name", "description", "commandsOrActions"],
          },
        },
      },
      required: ["toolName", "reason", "configFileTemplatePath", "configFileContent", "stages"],
    },
  },
  required: ["testingStrategy", "cicdStrategy"],
};

// ---------------------------------------------------------------------------
// Shared base persona. Each agent prepends its own focused mandate.
// ---------------------------------------------------------------------------
const BASE_PERSONA = `You are part of ARCH_OS, an elite full-stack architecture swarm.
A team of specialist agents collaborates SEQUENTIALLY to design a bespoke, production-grade
architecture for a natural-language web-application brief. Each agent emits ONLY its assigned
sections as strict JSON complying with the provided responseSchema. Never wrap JSON in markdown
fences. Never include sections you do not own. Stay perfectly consistent with the decisions made
by the agents that ran before you (their output is supplied to you as context).`;

function buildSharedContext(args: PlanArgs, accumulated: Partial<ArchitecturalPlanResponse>): string {
  const priorKeys = Object.keys(accumulated);
  const priorContext = priorKeys.length
    ? `\n\nDECISIONS ALREADY MADE BY PRIOR AGENTS (stay consistent — do NOT contradict these):\n${JSON.stringify(
        accumulated,
        null,
        2
      )}`
    : "";

  return `Project Input: "${args.prompt}"
Preferred Frontend: ${args.preferredFrontend || "No strict preference, recommend the best"}
Preferred Backend: ${args.preferredBackend || "No strict preference, recommend the best"}
Preferred Database: ${args.preferredDatabase || "No strict preference, recommend the best"}
Active Coding Agent Environment: [${args.agents.join(", ")}]${priorContext}`;
}

// ---------------------------------------------------------------------------
// Gemini client + a generic, bounded-retry, schema-validated call.
// ---------------------------------------------------------------------------
function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not defined. Please add your key in Settings > Secrets to continue."
    );
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface AgentSpec {
  systemInstruction: string;
  responseSchema: unknown;
  userPromptBase: string;
  requiredKeys: (keyof ArchitecturalPlanResponse)[];
}

// Top-level keys that MUST be arrays (Contract §4: validate that array keys
// are actually arrays, not just present/non-null). Guards against Gemini
// returning e.g. `scope: "..."` or `tree: {}` and feeding it downstream.
const ARRAY_KEYS: ReadonlySet<keyof ArchitecturalPlanResponse> = new Set([
  "scope",
  "tree",
]);

/**
 * Calls a single agent with bounded retry (the "self-healing" analog).
 * On parse failure / missing required keys, retries up to 2 extra times,
 * feeding the previous error back into the prompt. Throws if all attempts fail.
 */
async function runAgentWithRetry(
  ai: GoogleGenAI,
  spec: AgentSpec
): Promise<Partial<ArchitecturalPlanResponse>> {
  const MAX_ATTEMPTS = 3; // 1 initial + 2 retries
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? spec.userPromptBase
        : `${spec.userPromptBase}

YOUR PREVIOUS ATTEMPT FAILED VALIDATION with this error: "${lastError}".
Return corrected, complete JSON that includes EVERY required key for your section. Output JSON only.`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: userPrompt,
        config: {
          systemInstruction: spec.systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: spec.responseSchema,
        },
      });

      if (!response.text) {
        throw new Error("Received an empty response from Gemini API.");
      }

      const parsed = JSON.parse(response.text.trim()) as Partial<ArchitecturalPlanResponse>;

      const missing = spec.requiredKeys.filter(
        (k) => parsed[k] === undefined || parsed[k] === null
      );
      if (missing.length > 0) {
        throw new Error(`Missing required keys: ${missing.join(", ")}`);
      }

      // Sanity-check that keys which must be arrays are actually arrays
      // (Contract §4) — never emit/forward a malformed shape downstream.
      const badArrays = spec.requiredKeys.filter(
        (k) => ARRAY_KEYS.has(k) && !Array.isArray(parsed[k])
      );
      if (badArrays.length > 0) {
        throw new Error(`Expected array for keys: ${badArrays.join(", ")}`);
      }

      // Keep only the sections this agent owns.
      const result: Partial<ArchitecturalPlanResponse> = {};
      for (const k of spec.requiredKeys) {
        (result as Record<string, unknown>)[k] = parsed[k];
      }
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Agent attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
    }
  }

  throw new Error(lastError || "Agent failed after all retry attempts.");
}

// ---------------------------------------------------------------------------
// The four agents. Each returns ONLY its own sections.
// ---------------------------------------------------------------------------
export function runOrchestrator(
  ai: GoogleGenAI,
  args: PlanArgs,
  accumulated: Partial<ArchitecturalPlanResponse>
): Promise<Partial<ArchitecturalPlanResponse>> {
  const systemInstruction = `${BASE_PERSONA}

YOU ARE THE ORCHESTRATOR. You own: projectName, oneLiner, scope, stack, agentPlan.
- projectName: a crisp product name. oneLiner: one punchy sentence describing the product.
- scope: the concrete requirements & bounds extracted from the brief.
- stack: intelligent, justified choices for frontend, backend, database (with schemaPhilosophy)
  and infraAndCaching. Follow the user's explicit preferences when provided; otherwise recommend
  the best-fit modern stack (e.g. Next.js, Fastify, Go, Express, PostgreSQL, Redis, MongoDB,
  SQLite, ClickHouse, Firebase). Avoid generic defaults; justify the core choice in every reason field.
- agentPlan: a phased execution blueprint tailored to the user's chosen coding agent(s):
  [${args.agents.join(", ")}]. Address real agent mechanics — package install, system prompting,
  fast file-writing styles, and error troubleshooting — with setupPrerequisites, phases (title,
  description, steps, optional commandToRun) and agentSpecificTips.
Output strict JSON for ONLY these sections.`;

  return runAgentWithRetry(ai, {
    systemInstruction,
    responseSchema: orchestratorSchema,
    userPromptBase: `${buildSharedContext(args, accumulated)}

As the ORCHESTRATOR, analyze the spec, lock the project identity, requirement scope, the full
technology decision matrix, and the agent execution plan. Output JSON only.`,
    requiredKeys: ["projectName", "oneLiner", "scope", "stack", "agentPlan"],
  });
}

export function runDesigner(
  ai: GoogleGenAI,
  args: PlanArgs,
  accumulated: Partial<ArchitecturalPlanResponse>
): Promise<Partial<ArchitecturalPlanResponse>> {
  const systemInstruction = `${BASE_PERSONA}

YOU ARE THE DESIGNER. You own: frontendGuide.
Detail a high-performance frontend vector consistent with the chosen frontend framework:
- stylingLibrary: the recommended styling approach/library.
- performanceTricks: concrete speed enhancers & LCP targets (responsive assets, layout caching,
  code splitting, layout-shift reduction, clean Tailwind optimizations, etc.).
- modularPatterns: enterprise design-separation / modular architecture patterns.
Output strict JSON for ONLY the frontendGuide section.`;

  return runAgentWithRetry(ai, {
    systemInstruction,
    responseSchema: designerSchema,
    userPromptBase: `${buildSharedContext(args, accumulated)}

As the DESIGNER, produce the frontendGuide tuned to the frontend framework already chosen by the
Orchestrator. Output JSON only.`,
    requiredKeys: ["frontendGuide"],
  });
}

export function runCoder(
  ai: GoogleGenAI,
  args: PlanArgs,
  accumulated: Partial<ArchitecturalPlanResponse>
): Promise<Partial<ArchitecturalPlanResponse>> {
  const systemInstruction = `${BASE_PERSONA}

YOU ARE THE CODER. You own: tree, boilerplates, authStrategy.
- tree: a complete, production-grade directory structure as a flat array of nodes. Each node has a
  full "path", a "type" of "file" or "directory", and an optional short "shortLabel". Nest logically.
- boilerplates: a map from exact file paths in your tree to COMPLETE, beautifully written, non-stubbed
  TypeScript/JavaScript code (pages, layouts, db models, controllers, connections, middleware, routers).
  Optimized imports, real interfaces, NO truncated placeholders or empty comments.
- authStrategy: a robust authentication & authorization strategy (method e.g. JWT/OAuth/session,
  passwordManagement with hashing+salting, rbac) plus a concrete boilerplatePath and full boilerplateCode
  for the chosen backend technology.
Respect the stack and frontendGuide already decided. Output strict JSON for ONLY these sections.`;

  return runAgentWithRetry(ai, {
    systemInstruction,
    responseSchema: coderSchema,
    userPromptBase: `${buildSharedContext(args, accumulated)}

As the CODER, scaffold the directory tree, write full production boilerplates keyed by file path, and
define the authentication & authorization strategy with real boilerplate code. The tree must respect the
Orchestrator's stack and the Designer's frontendGuide. Output JSON only.`,
    requiredKeys: ["tree", "boilerplates", "authStrategy"],
  });
}

export function runTester(
  ai: GoogleGenAI,
  args: PlanArgs,
  accumulated: Partial<ArchitecturalPlanResponse>
): Promise<Partial<ArchitecturalPlanResponse>> {
  const systemInstruction = `${BASE_PERSONA}

YOU ARE THE TESTER. You own: testingStrategy, cicdStrategy.
- testingStrategy: pick a great framework (Vitest, Playwright, Jest, Cypress). Provide testingFramework,
  the run command, configBoilerplatePath + full configBoilerplate, and a real sampleTestPath +
  sampleTestCode with genuine assertions (verify an endpoint or component mock state). No placeholders.
- cicdStrategy: provide toolName (e.g. GitHub Actions), reason, configFileTemplatePath, the full
  configFileContent (e.g. a complete workflow yml), and stages — each stage with name, description, and
  commandsOrActions (an array of strings). Keep it consistent with the chosen stack and tests.
Output strict JSON for ONLY these two sections.`;

  return runAgentWithRetry(ai, {
    systemInstruction,
    responseSchema: testerSchema,
    userPromptBase: `${buildSharedContext(args, accumulated)}

As the TESTER, design the automated testing configuration and the full CI/CD pipeline strategy that fit
the stack, boilerplates, and commands already established. Output JSON only.`,
    requiredKeys: ["testingStrategy", "cicdStrategy"],
  });
}

// ---------------------------------------------------------------------------
// Streaming driver: runs the four agents sequentially, emitting SSE frames.
// Never throws on a single agent failure — emits agent_error and continues.
// ---------------------------------------------------------------------------
type AgentRunner = (
  ai: GoogleGenAI,
  args: PlanArgs,
  accumulated: Partial<ArchitecturalPlanResponse>
) => Promise<Partial<ArchitecturalPlanResponse>>;

const PIPELINE: { agent: AgentName; run: AgentRunner }[] = [
  { agent: "ORCHESTRATOR", run: runOrchestrator },
  { agent: "DESIGNER", run: runDesigner },
  { agent: "CODER", run: runCoder },
  { agent: "TESTER", run: runTester },
];

export async function generatePlanStreaming(
  args: PlanArgs,
  emit: (event: SSEEvent) => void,
  isAborted: () => boolean
): Promise<void> {
  const ai = getClient();
  const plan: Partial<ArchitecturalPlanResponse> = {};

  for (const { agent, run } of PIPELINE) {
    if (isAborted()) return;

    emit({ type: "agent_start", agent });

    try {
      const payload = await run(ai, args, plan);
      if (isAborted()) return;
      Object.assign(plan, payload);
      emit({ type: "agent_complete", agent, payload });
    } catch (error: unknown) {
      if (isAborted()) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Agent ${agent} failed permanently: ${message}`);
      emit({ type: "agent_error", agent, error: message });
      // Non-fatal: continue the pipeline with this section omitted.
    }
  }

  if (isAborted()) return;
  emit({ type: "done" });
}
