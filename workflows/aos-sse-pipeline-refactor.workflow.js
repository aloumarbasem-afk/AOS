export const meta = {
  name: 'aos-sse-pipeline-refactor',
  description: 'Refactor AOS single-shot Gemini call into a streaming 4-agent SSE pipeline (parallel backend/frontend build + verify + adversarial SSE review)',
  phases: [
    { title: 'Contract', detail: 'Rewrite types.ts (optional fields + SSEEvent union); emit shared contract' },
    { title: 'Build', detail: 'Backend (server.ts+api-handler.ts) and Frontend (App.tsx) in parallel — disjoint files' },
    { title: 'Verify', detail: 'npm install + tsc --noEmit + vite build; repair cross-file type drift until green' },
    { title: 'Review', detail: 'Adversarial SSE robustness audit; repair criticals; re-verify' },
  ],
}

const REPO = '/Users/basemaloumar/Developer/AOS'

const SHARED_SPEC = `
PROJECT: ${REPO} — TS/React 19 + Vite 6 + Express 4 + @google/genai ^2.4.0, tailwind v4, lucide-react, motion, react-markdown.
Scripts: dev=vite, start=tsx server.ts, build=vite build, lint=tsc --noEmit.

GOAL: Convert single-shot generateArchitecturalPlan Gemini call into a SEQUENTIAL 4-agent swarm that STREAMS each agent's output to the browser over SSE so the dashboard fills in section-by-section live.

AGENT -> JSON SECTION MAPPING (sequential; each agent receives all prior agents' output as input context):
1. ORCHESTRATOR -> projectName, oneLiner, scope, stack, agentPlan
2. DESIGNER     -> frontendGuide
3. CODER        -> tree, boilerplates, authStrategy
4. TESTER       -> testingStrategy, cicdStrategy
Each agent gets its OWN narrow Gemini responseSchema covering ONLY its sections. Do NOT reuse the monolithic schema.

SSE EVENT PROTOCOL (newline-delimited frames, always: data: <json>\\n\\n):
- {"type":"agent_start","agent":"ORCHESTRATOR"}      // emit BEFORE calling each agent (drives the "currently working" UI)
- {"type":"agent_complete","agent":"ORCHESTRATOR","payload":{...only that agent's sections...}}  // frontend MERGES payload into plan
- {"type":"agent_error","agent":"DESIGNER","error":"..."}  // non-fatal; pipeline continues with that section omitted
- {"type":"done"}                                    // final frame, then res.end()
AgentName enum: ORCHESTRATOR | DESIGNER | CODER | TESTER.

BOUNDED RETRY ("self-healing" analog — no running code to test): after each Gemini call, parse JSON + sanity-check required keys; on failure retry that SINGLE agent up to 2 times feeding the error back into the retry prompt; if still failing emit agent_error and CONTINUE. Never crash the stream or write malformed JSON downstream.

CRITICAL CORRECTNESS NOTES (verified against the real code):
- cicdStrategy BUG: old api-handler schema {provider, stages:[{name,commands}]} does NOT match types.ts CicdPipelineStrategy NOR what App.tsx renders. CORRECT shape (used by UI ~lines 711-768): { toolName, reason, configFileTemplatePath, configFileContent, stages:[{ name, description, commandsOrActions:string[] }] }. TESTER schema MUST match types.ts/UI. Same for testingStrategy -> match TestingSuiteStrategy.
- Keep oneLiner (rendered App.tsx ~line 444), produced by Orchestrator.
- Preserve request params: prompt, agents(string[]), preferredFrontend, preferredBackend, preferredDatabase. Thread them in (agents -> agentPlan; preferences -> stack).
- Keep model id EXACTLY: gemini-3.5-flash. Keep @google/genai v2 API: new GoogleGenAI({apiKey}) + ai.models.generateContent({model, contents, config:{systemInstruction, temperature, responseMimeType, responseSchema}}). Gemini calls are normal (non-streaming) generateContent; streaming is ONLY to the browser via SSE.
- Keep GEMINI_API_KEY guard.
- Preserve ALL existing UI markup/design/ids/classNames/copy-to-clipboard/tree explorer. UI already uses optional chaining throughout.
`

phase('Contract')
const CONTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['contract', 'sseEventTypeName', 'done'],
  properties: {
    contract: { type: 'string', description: 'Markdown contract: exact SSE frame shapes, AgentName enum, per-agent section ownership, corrected cicd/testing shapes. Phase-2 agents rely on this verbatim.' },
    sseEventTypeName: { type: 'string', description: 'The exported TS type name for the SSE union (e.g. SSEEvent).' },
    done: { type: 'boolean' },
  },
}

const contract = await agent(
  `${SHARED_SPEC}

YOUR TASK (Phase 1 — shared contract). Edit ONLY src/types.ts. Do not touch other files. Do not run npm/build.
1. Read src/types.ts fully. Keep all existing sub-interfaces (StackDetails, DecisionMatrix, FileTreeNode, ExecutionPhase, AgentBlueprint, FrontendOptimizationGuide, TestingSuiteStrategy, CicdPipelineStrategy, AuthStrategy).
2. Make EVERY top-level field of ArchitecturalPlanResponse OPTIONAL (the object is assembled incrementally on the client). Keep sub-interface internals required.
3. Add: export type AgentName = 'ORCHESTRATOR'|'DESIGNER'|'CODER'|'TESTER'.
4. Add an exported discriminated union SSEEvent with variants agent_start {type,agent}, agent_complete {type,agent,payload:Partial<ArchitecturalPlanResponse>}, agent_error {type,agent,error}, done {type}.
5. Write the file (durable).
Then RETURN a precise markdown 'contract' that the backend and frontend agents will follow verbatim — include the exact SSE frame JSON shapes, the AgentName enum, which agent owns which sections, and the CORRECTED cicdStrategy + testingStrategy shapes (per the critical notes above). Set done=true.`,
  { label: 'contract:types.ts', phase: 'Contract', schema: CONTRACT_SCHEMA }
)

const CONTRACT_BLOCK = contract && contract.contract
  ? `\n\n=== SHARED CONTRACT (follow verbatim; src/types.ts already updated) ===\n${contract.contract}\n=== END CONTRACT ===\n`
  : '\n\n(NOTE: contract agent returned no text — re-read src/types.ts yourself for the SSEEvent union and Partial fields.)\n'

phase('Build')
const FILE_REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['filesChanged', 'summary'],
  properties: {
    filesChanged: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    deviations: { type: 'string' },
  },
}

const [backend, frontend] = await parallel([
  () => agent(
    `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 2 — BACKEND). Edit ONLY server.ts and src/api-handler.ts. Do NOT touch src/App.tsx or src/types.ts. Do NOT run npm install / lint / build (a later phase verifies).
src/api-handler.ts:
- Remove the monolithic generateArchitecturalPlan + giant responseSchema.
- Add runOrchestrator/runDesigner/runCoder/runTester, each (args, accumulatedPlan) -> its partial sections, each with its OWN narrow schema + focused systemInstruction adapted from the existing one. Build TESTER schemas to match types.ts (corrected cicd/testing shapes).
- Add: export async function generatePlanStreaming(args, emit, isAborted). It runs the 4 agents sequentially: check isAborted() between agents; emit agent_start; run-with-retry (max 2 retries, validate required keys); Object.assign(plan, payload); emit agent_complete; on hard failure emit agent_error and continue; finally emit {type:'done'}. Pass accumulatedPlan into each later agent's user prompt for consistency (Coder tree respects Orchestrator stack + Designer guide).
- Keep GEMINI_API_KEY guard. Keep model gemini-3.5-flash and @google/genai v2 call style.
server.ts:
- POST /api/generate-plan -> SSE: keep the !prompt 400 JSON guard FIRST (before SSE headers). Then set headers Content-Type:text/event-stream, Cache-Control:no-cache, Connection:keep-alive; res.flushHeaders?.().
- Build emit(event) = res.write('data: ' + JSON.stringify(event) + '\\n\\n'). Use an AbortController/cancelled flag set by req.on('close', ...) and pass isAborted to generatePlanStreaming so you never write to a dead socket.
- Wrap in try/catch: on error emit an agent_error/error frame then res.end(); always res.end() after done.
- Update the import (generateArchitecturalPlan -> generatePlanStreaming). Keep static serving + app.get('*') fallback.
Return filesChanged + summary + any deviations.`,
    { label: 'build:backend', phase: 'Build', schema: FILE_REPORT_SCHEMA }
  ),
  () => agent(
    `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 2 — FRONTEND). Edit ONLY src/App.tsx. Do NOT touch server.ts, src/api-handler.ts, or src/types.ts. Do NOT run npm install / lint / build (a later phase verifies).
- Read src/App.tsx fully first. Preserve ALL existing panels, ids, classNames, copy-to-clipboard, tree explorer, presets, and design. Only rewire data flow.
- Do NOT use EventSource (GET-only; route is POST). Rewrite generateBlueprint() to fetch POST then read response.body.getReader() with a TextDecoder; maintain a string buffer; split on '\\n\\n'; for each complete frame strip leading 'data: ' and JSON.parse. IMPORTANT: handle frames split across chunk boundaries — keep the trailing partial in the buffer; only parse complete frames.
- Change result to accumulate: type Partial<ArchitecturalPlanResponse> | null; on agent_complete -> setResult(prev => ({ ...(prev||{}), ...payload })). On first boilerplates arrival, keep the existing auto-select-first-file behavior.
- Add activeAgent: AgentName | null state: set on agent_start, clear on done.
- Show the results dashboard as soon as ANY data has arrived (stop gating the whole dashboard on !isLoading) so sections appear live. Drive the loading visual/status text from the real activeAgent instead of (or in addition to) the simulated loadingSteps interval — the displayed step MUST reflect the real active agent. A subtle shimmer is fine.
- On agent_error, surface a non-fatal inline warning but keep going. Keep the existing errorMsg banner for fatal/network errors. Ensure every array .map is guarded for partial state.
- Import AgentName / SSEEvent from ./types as needed.
Return filesChanged + summary + any deviations.`,
    { label: 'build:frontend', phase: 'Build', schema: FILE_REPORT_SCHEMA }
  ),
])

phase('Verify')
const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lintPassed', 'buildPassed', 'lintTail', 'buildTail'],
  properties: {
    lintPassed: { type: 'boolean' },
    buildPassed: { type: 'boolean' },
    lintTail: { type: 'string', description: 'Last ~30 lines of npm run lint output' },
    buildTail: { type: 'string', description: 'Last ~30 lines of npm run build output' },
    fixesApplied: { type: 'string' },
  },
}

const verify = await agent(
  `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 3 — VERIFY & REPAIR) in ${REPO}.
1. cd ${REPO} && npm install (run even if node_modules exists).
2. Run: npm run lint  (this is tsc --noEmit). It MUST pass with zero errors.
3. Run: npm run build (vite build). It MUST succeed.
If there are type errors or build errors caused by cross-file drift between the parallel backend/frontend/types work, FIX them directly (edit whichever of server.ts, src/api-handler.ts, src/types.ts, src/App.tsx is wrong — keep the SSE contract intact and the UI design intact). Re-run lint+build after fixes. Iterate until BOTH are green or you have exhausted reasonable attempts.
Do NOT run the dev server or make live Gemini calls (no API key). Do NOT git commit/push.
Return lintPassed, buildPassed, the tail outputs, and a summary of fixesApplied.`,
  { label: 'verify:lint+build', phase: 'Verify', schema: VERIFY_SCHEMA }
)

phase('Review')
const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'file', 'detail'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          file: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
  },
}

const review = await agent(
  `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 4 — ADVERSARIAL SSE AUDIT). READ ONLY (do not edit). Inspect server.ts, src/api-handler.ts, src/App.tsx and find REAL defects in the streaming pipeline. Focus on:
- Frontend: SSE frames split across TextDecoder chunk boundaries — is a partial trailing frame buffered and not parsed until complete? Is JSON.parse wrapped against malformed frames? Is the reader loop terminated on done and on stream end?
- Backend: is the !prompt 400 returned BEFORE switching to SSE headers? Is res.write guarded after client disconnect (req.on('close'))? Is res.end() always called (done + error paths)? Does a single agent failure correctly emit agent_error and CONTINUE rather than killing the stream? Is the 2-retry bound actually enforced?
- Contract: do emitted payload keys exactly match the AgentName ownership and the corrected cicd/testing shapes? Any agent writing a section it doesn't own?
- Partial render: any App.tsx array .map not guarded for undefined during streaming?
Return ONLY genuine findings with severity. Empty array if clean.`,
  { label: 'review:sse-audit', phase: 'Review', schema: REVIEW_SCHEMA }
)

const criticals = (review && review.findings ? review.findings : []).filter(f => f.severity === 'critical' || f.severity === 'major')

let repair = null
if (criticals.length) {
  log(`Adversarial audit found ${criticals.length} critical/major issue(s) — dispatching repair + re-verify`)
  repair = await agent(
    `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 4b — REPAIR). Fix ONLY these confirmed issues in ${REPO}, preserving the SSE contract and UI design:
${criticals.map((f, i) => `${i + 1}. [${f.severity}] ${f.file} — ${f.title}: ${f.detail}`).join('\n')}
After fixing, cd ${REPO} && npm run lint && npm run build — both MUST stay green. Do NOT git commit/push. Return a short summary + the lint/build tail proving green.`,
    { label: 'review:repair', phase: 'Review' }
  )
}

return {
  types: contract && { sseEventTypeName: contract.sseEventTypeName },
  backend: backend && backend.summary,
  frontend: frontend && frontend.summary,
  verify: verify && { lintPassed: verify.lintPassed, buildPassed: verify.buildPassed },
  auditFindings: review && review.findings,
  repaired: criticals.length,
  repairSummary: repair,
}
