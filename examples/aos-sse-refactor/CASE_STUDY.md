# Case study — AOS: single-shot → streaming 4-agent SSE pipeline

The worked example this playbook was extracted from. Repo under refactor: **AOS** — an LLM
"full-stack architecture planner": you describe an app, Gemini returns a complete blueprint
(stack, file tree, boilerplate, auth, tests, CI/CD) rendered on a dashboard.

## The task

> *Refactor the single-shot architecture into a real-time, stateful, multi-agent pipeline using
> Server-Sent Events (SSE).* One monolithic Gemini call (one giant `responseSchema`) → a sequential
> **4-agent swarm** (Orchestrator → Designer → Coder → Tester) that **streams** each agent's output
> to the browser so the dashboard fills in section-by-section.

Four files: `server.ts`, `src/api-handler.ts`, `src/types.ts`, `src/App.tsx` (plus a dev-server
middleware hiding in `vite.config.ts` — see "What the audit/agents caught").

## How the workflow was decided (applying METHODOLOGY.md)

1. **Dependency graph** → `types.ts` imported by both `api-handler.ts` (backend) and `App.tsx`
   (frontend); backend and frontend share no files and communicate only via the SSE JSON contract.
2. **Seam** → contract (`types.ts`) is upstream and shared; backend vs. frontend are disjoint domains.
3. **Therefore**: Contract phase first (alone), then backend + frontend **in parallel** with disjoint
   file ownership (no worktrees needed), then a Verify phase to catch boundary drift, then an
   adversarial SSE audit because streaming protocols are full of plausible-but-wrong edge cases.

```
Phase 1 Contract  : 1 agent  — rewrite types.ts (optional fields + SSEEvent union) + emit contract
Phase 2 Build     : 2 agents — backend (server.ts + api-handler.ts) ‖ frontend (App.tsx)
Phase 3 Verify    : 1 agent  — npm install + tsc --noEmit + vite build; repair drift to green
Phase 4 Review    : 1 agent  — adversarial SSE audit; +1 conditional repair agent
                    = 6 agents total
```

## The contract the agents shared

- **Agent → section ownership:** Orchestrator → `projectName, oneLiner, scope, stack, agentPlan`;
  Designer → `frontendGuide`; Coder → `tree, boilerplates, authStrategy`; Tester → `testingStrategy, cicdStrategy`.
- **SSE protocol** (newline-delimited `data: <json>\n\n` frames):
  `agent_start` (before each agent, drives the live UI) → `agent_complete` (payload merged client-side)
  → `agent_error` (non-fatal, section skipped) → `done` (terminator, then `res.end()`).
- **Bounded retry** ("self-healing" analog): validate each agent's JSON; retry that agent up to 2×
  feeding the error back; then `agent_error` + continue. Never crash the stream or pass malformed JSON.

## Results

- **`tsc --noEmit`**: clean. **`vite build`**: green (1673 modules, ~0.8s).
- Net diff **+653 / −233** across **5** files.
- Pre-existing bug fixed as a side effect: `cicdStrategy`'s Gemini schema didn't match the TS type
  *or* the UI (`{provider, stages:[{name,commands}]}` vs. the real `CicdPipelineStrategy`). Splitting
  into per-agent schemas forced the correct shape.

## What the agents / audit caught (the payoff)

- **Backend agent** discovered the API is implemented in **two** places — `server.ts` (prod) *and* a
  dev-server middleware in `vite.config.ts` (`npm run dev`). Both call the handler, so both had to be
  migrated, or `npm run dev` would crash on the deleted function. A single-file mental model would
  have missed it.
- **Adversarial audit (major, auto-repaired):** the whole results dashboard was gated on `result`
  being non-null, and `result` is only set on the first `agent_complete`. So if the **Orchestrator**
  (first agent) failed all retries, the stream emitted `agent_error` and continued, but the UI showed
  the empty welcome state with **zero indication anything failed** — a silent failure. Fix: render the
  per-agent warnings panel outside the `result &&` gate. Re-verified green.
- **Minor (hand-fixed after the run):** a pre-loop throw (e.g. missing `GEMINI_API_KEY`) ended the
  stream with `agent_error` but no final `done` frame — a contract violation. Fixed in both `server.ts`
  and the `vite.config.ts` dev middleware for parity.

## Files in this example

- [`the-prompt-i-ran.md`](./the-prompt-i-ran.md) — every prompt sent to every agent, verbatim.
- [`../../workflows/aos-sse-pipeline-refactor.workflow.js`](../../workflows/aos-sse-pipeline-refactor.workflow.js)
  — the exact orchestration script.

## Lessons that generalized into the playbook

- The audit phase is not optional theater — it caught a real user-facing silent failure that every
  "does it compile" check passed.
- Read the *whole* surface before splitting ownership: the second API implementation (`vite.config.ts`)
  was the kind of seam a generic template would never predict.
- Disjoint file ownership made 2 agents run in parallel in one tree with zero merge cost — the verify
  phase was the only integration point, and it was cheap.
