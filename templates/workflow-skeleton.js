/**
 * GENERIC 4-PHASE WORKFLOW SKELETON  (Claude Code `Workflow` tool dialect)
 * ----------------------------------------------------------------------------
 * Contract (1 agent) -> Build (N parallel, disjoint files) -> Verify (1) -> Review (1 + conditional repair)
 *
 * Copy this file, then fill in the four CONFIG blocks marked `<<< EDIT >>>`.
 * For other tools (Cursor, Codex CLI, custom), translate the same control flow — see /adapters.
 *
 * API surface used: agent(prompt, {label, phase, schema}) | parallel(thunks) | phase(title) | log(msg)
 *   - agent() with a `schema` returns a validated object; without, returns the final text string.
 *   - parallel() is a BARRIER (awaits all); use pipeline() instead if stages don't need to sync.
 */

export const meta = {
  name: 'my-task-workflow',                              // <<< EDIT
  description: 'One-line description shown in the permission dialog', // <<< EDIT
  phases: [
    { title: 'Contract', detail: 'Write the shared source of truth' },
    { title: 'Build',    detail: 'Parallel agents, disjoint file ownership' },
    { title: 'Verify',   detail: 'Run real gates; repair drift to green' },
    { title: 'Review',   detail: 'Adversarial audit; conditional repair' },
  ],
}

// ── Shared context every agent receives ──────────────────────────────────────
const PROJECT = '/abs/path/to/repo'                      // <<< EDIT
const SHARED_SPEC = `                                     // <<< EDIT
PROJECT: ${PROJECT} — <stack, key deps, build/test scripts>.
GOAL: <the single sentence the whole run is about>.
INTERFACE / PROTOCOL: <the shared contract in brief — the thing all parts agree on>.
HARD CONSTRAINTS: <versions/APIs/strings to keep; behavior to preserve>.
`

// ── Output schemas (force machine-checkable returns) ─────────────────────────
const CONTRACT_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['contract', 'done'],
  properties: { contract: { type: 'string' }, done: { type: 'boolean' } } }

const FILE_REPORT_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['filesChanged', 'summary'],
  properties: { filesChanged: { type: 'array', items: { type: 'string' } },
                summary: { type: 'string' }, deviations: { type: 'string' } } }

const VERIFY_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['gatesPassed', 'gateOutputTail'],
  properties: { gatesPassed: { type: 'boolean' },
                gateOutputTail: { type: 'string' }, fixesApplied: { type: 'string' } } }

const REVIEW_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['title', 'severity', 'file', 'detail'],
    properties: { title: { type: 'string' },
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      file: { type: 'string' }, detail: { type: 'string' } } } } } }

// ── Phase 1 — CONTRACT (alone) ───────────────────────────────────────────────
phase('Contract')
const contract = await agent(
  `${SHARED_SPEC}

YOUR TASK (Phase 1 — shared contract). Edit ONLY <the upstream artifact>. Do not touch other files.
1. <write the shared interface/types/schema>.
Then RETURN a precise markdown 'contract' restating exact shapes, names, and per-agent file
ownership that downstream agents will follow verbatim. Set done=true.`,            // <<< EDIT
  { label: 'contract', phase: 'Contract', schema: CONTRACT_SCHEMA }
)
const CONTRACT_BLOCK = contract && contract.contract
  ? `\n\n=== SHARED CONTRACT (follow verbatim) ===\n${contract.contract}\n=== END CONTRACT ===\n`
  : '\n\n(NOTE: no contract text returned — re-read the upstream artifact yourself.)\n'

// ── Phase 2 — BUILD (parallel, disjoint ownership) ───────────────────────────
phase('Build')
const BUILD_AGENTS = [                                    // <<< EDIT: one entry per disjoint domain
  { label: 'build:domainA', files: '<files A>', task: '<what A does>' },
  { label: 'build:domainB', files: '<files B>', task: '<what B does>' },
]
const builds = await parallel(BUILD_AGENTS.map(a => () => agent(
  `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 2 — ${a.label}). Edit ONLY: ${a.files}. Do NOT touch any other agent's files.
Do NOT run build/test (Phase 3 verifies).
${a.task}
Return filesChanged + summary + any deviations.`,
  { label: a.label, phase: 'Build', schema: FILE_REPORT_SCHEMA }
)))

// ── Phase 3 — VERIFY + repair (alone) ────────────────────────────────────────
phase('Verify')
const verify = await agent(
  `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 3 — VERIFY & REPAIR) in ${PROJECT}.
Run the real gates: <e.g. npm run lint && npm run build && npm test>. They MUST pass.
If parallel-agent drift broke something, FIX whichever file is wrong (keep the contract intact),
re-run, and iterate to green. Do NOT commit/push.
Return gatesPassed + the actual gate output tail + a summary of fixesApplied.`,    // <<< EDIT gates
  { label: 'verify', phase: 'Verify', schema: VERIFY_SCHEMA }
)

// ── Phase 4 — REVIEW (read-only) + conditional repair ────────────────────────
phase('Review')
const review = await agent(
  `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 4 — ADVERSARIAL AUDIT). READ ONLY. Try to REFUTE the implementation: find silent
failures, unhandled edge cases, contract violations, "looks fine but breaks when X". Focus on:
<the specific failure modes that matter for this task>.                           // <<< EDIT
Return ONLY genuine findings with severity. Empty array if clean.`,
  { label: 'review', phase: 'Review', schema: REVIEW_SCHEMA }
)

const criticals = (review?.findings ?? []).filter(f => f.severity === 'critical' || f.severity === 'major')
let repair = null
if (criticals.length) {
  log(`Audit found ${criticals.length} critical/major issue(s) — dispatching repair + re-verify`)
  repair = await agent(
    `${SHARED_SPEC}${CONTRACT_BLOCK}

YOUR TASK (Phase 4b — REPAIR). Fix ONLY these confirmed issues in ${PROJECT}, preserving the contract:
${criticals.map((f, i) => `${i + 1}. [${f.severity}] ${f.file} — ${f.title}: ${f.detail}`).join('\n')}
After fixing, re-run the gates — they MUST stay green. Do NOT commit/push. Return a short summary + the gate tail.`,
    { label: 'review:repair', phase: 'Review' }
  )
}

return {
  build: builds.filter(Boolean).map(b => b.summary),
  verify: verify && { gatesPassed: verify.gatesPassed },
  auditFindings: review?.findings,
  repaired: criticals.length,
  repairSummary: repair,
}
