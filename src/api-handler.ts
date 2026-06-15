import { GoogleGenAI, Type } from "@google/genai";
import { ArchitecturalPlanResponse } from "./types";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING },
    oneLiner: { type: Type.STRING },
    scope: { type: Type.ARRAY, items: { type: Type.STRING } },
    stack: {
      type: Type.OBJECT,
      properties: {
        frontend: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            version: { type: Type.STRING },
            reason: { type: Type.STRING },
            advantages: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "version", "reason", "advantages"]
        },
        backend: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            version: { type: Type.STRING },
            reason: { type: Type.STRING },
            advantages: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "version", "reason", "advantages"]
        },
        database: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            version: { type: Type.STRING },
            reason: { type: Type.STRING },
            advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
            schemaPhilosophy: { type: Type.STRING }
          },
          required: ["name", "version", "reason", "advantages", "schemaPhilosophy"]
        },
        infraAndCaching: {
          type: Type.OBJECT,
          properties: {
            hosting: { type: Type.STRING },
            cacheOrQueue: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["hosting", "reason"]
        }
      },
      required: ["frontend", "backend", "database", "infraAndCaching"]
    },
    tree: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          type: { type: Type.STRING }, // "file" | "directory"
          shortLabel: { type: Type.STRING }
        },
        required: ["path", "type"]
      }
    },
    boilerplates: {
      type: Type.OBJECT,
      description: "Key-value map of exact file paths from 'tree' to complete, production-ready, highly professional boilerplate code contents."
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
              commandToRun: { type: Type.STRING }
            },
            required: ["title", "description", "steps"]
          }
        },
        agentSpecificTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["agentName", "setupPrerequisites", "phases", "agentSpecificTips"]
    },
    frontendGuide: {
      type: Type.OBJECT,
      properties: {
        stylingLibrary: { type: Type.STRING },
        performanceTricks: { type: Type.ARRAY, items: { type: Type.STRING } },
        modularPatterns: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["stylingLibrary", "performanceTricks", "modularPatterns"]
    },
    testingStrategy: {
      type: Type.OBJECT,
      properties: {
        testingFramework: { type: Type.STRING },
        command: { type: Type.STRING },
        configBoilerplatePath: { type: Type.STRING },
        configBoilerplate: { type: Type.STRING },
        sampleTestPath: { type: Type.STRING },
        sampleTestCode: { type: Type.STRING }
      },
      required: [
        "testingFramework",
        "command",
        "configBoilerplatePath",
        "configBoilerplate",
        "sampleTestPath",
        "sampleTestCode"
      ]
    },
    cicdStrategy: {
      type: Type.OBJECT,
      properties: {
        provider: { type: Type.STRING },
        stages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              commands: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "commands"]
          }
        }
      },
      required: ["provider", "stages"]
    },
    authStrategy: {
      type: Type.OBJECT,
      properties: {
        method: { type: Type.STRING },
        passwordManagement: { type: Type.STRING },
        rbac: { type: Type.STRING },
        boilerplatePath: { type: Type.STRING },
        boilerplateCode: { type: Type.STRING }
      },
      required: [
        "method",
        "passwordManagement",
        "rbac",
        "boilerplatePath",
        "boilerplateCode"
      ]
    }
  },
  required: [
    "projectName",
    "oneLiner",
    "scope",
    "stack",
    "tree",
    "boilerplates",
    "agentPlan",
    "frontendGuide",
    "testingStrategy",
    "cicdStrategy",
    "authStrategy"
  ]
};

export async function generateArchitecturalPlan(
  prompt: string,
  agents: string[],
  preferredFrontend?: string,
  preferredBackend?: string,
  preferredDatabase?: string
): Promise<ArchitecturalPlanResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not defined. Please add your key in Settings > Secrets to continue."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemInstruction = `You are an Elite Senior Full-Stack Architect and Developer operating under ARCH_OS.
Your goal is to parse a natural language prompt for a full-stack web application, analyze user requirements, database requirements, performance vectors, and design the best suited bespoke architecture.

GUIDELINES:
1. Intelligence Stack Choice: 
   - Follow the user's explicit preferences for frontend, backend, and database if provided.
   - If not provided or unsure, provide intelligent recommendations based on common use cases and project complexity (e.g. Next.js, Fastify with Node, Go, Express, PostgreSQL, Redis, MongoDB, ClickHouse, SQLite, firebase, etc.). Avoid defaults. Justify the core choice in reason fields.
   - You MUST generate architecture, directory structure, and boilerplate code based on these selections.
2. Complete Directory Structure: Provide a clear, production-grade folder structure representation. Include files and directories logically nested.
3. Tailored Boilerplates: For main files in the structure (e.g. page, layouts, db models, controller endpoints, connections, middleware, router), generate complete, beautifully written, non-stubbed TypeScript/JavaScript code boilerplates as the values of the "boilerplates" map. Ensure they feature optimized imports and standard interfaces. No truncated placeholders or empty comments!
4. Agent Specific Execution Strategy: Formulate a clear set of phased steps (e.g. Phase 1 Setup, Phase 2 Core Models) tailored directly for execution speed under the user's chosen coding agent(s): [${agents.join(", ")}]. Address real agent mechanics like package installation, system prompting, fast file-writing styles, and error troubleshooting.
5. High Performance Frontend Vector: Detail key design rules using optimized styling libraries and performance tricks (e.g. responsive assets, layout caching, code splitting, layout shifts reduction, clean Tailwind optimizations, etc.).
6. Full Automated Test Suite: Pick an amazing automated testing framework like Vitest, Playwright, Jest, or Cypress. Generate the exact testing config file contents and a complete, functioning sample test with real assert statements (e.g., verifying an endpoint or component mock state). No mock placeholders.
7. Authentication & Authorization Strategy: Outline a robust user authentication and authorization strategy. Include choices for authenticating users (e.g., JWT, OAuth, session-based), password management (hashing and salting), and role-based access control (RBAC). Provide absolute necessary boilerplate paths and code for implementing these features in the chosen back-end technology.

Format strictly as JSON complying with the provided responseSchema.`;

  const userPrompt = `Project Input: "${prompt}"
Preferred Frontend: ${preferredFrontend || "No strict preference, recommend the best"}
Preferred Backend: ${preferredBackend || "No strict preference, recommend the best"}
Preferred Database: ${preferredDatabase || "No strict preference, recommend the best"}
Active Coding Agent Environment: [${agents.join(", ")}]

Please analyze this spec, compile decisions, structure the directory hierarchy, provide high-quality full boilerplates, and build a tailored agent pipeline configuration. Ensure code templates are fully functional and written in proper conventions. Include the authentication strategy boilerplate code as requested.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) {
      throw new Error("Received an empty response from Gemini API.");
    }

    const payload = JSON.parse(response.text.trim()) as ArchitecturalPlanResponse;
    return payload;
  } catch (error: any) {
    console.error("Gemini API architectural planning error:", error);
    throw new Error(error.message || "Failed to generate your full-stack plan. Please check your prompt and secret configuration.");
  }
}
