# Agent spec template

Fill one of these out per agent. Keep it boring and explicit — ambiguity is where parallel agents
diverge. Everything here is tool-agnostic; the adapters show how to feed it to a specific tool.

Two pieces of context are shared by **every** agent in a run:

1. **`SHARED_SPEC`** — the project facts + the goal + the global contract (stack, file layout, the
   protocol/interface, hard constraints). Written once, prepended to every agent prompt.
2. **`CONTRACT_BLOCK`** — the prose contract returned by the Contract phase, injected verbatim into
   every later agent so they share one interpretation.

---

## Template

```
ROLE:           <one line — what this agent is responsible for>
PHASE:          <Contract | Build | Verify | Review | ...>
RUNS:           <alone | in parallel with: [other agents]>

INPUTS:
  - SHARED_SPEC (always)
  - CONTRACT_BLOCK (always, except the Contract agent which produces it)
  - <prior agent outputs this one needs, named explicitly>

FILE OWNERSHIP (STRICT):
  MAY EDIT:     <exact file list — the ONLY files this agent writes>
  MUST NOT TOUCH: <files owned by other agents, named explicitly>

TASK (numbered, imperative, verifiable):
  1. <read X fully first>
  2. <do the specific thing>
  3. <...>

CONSTRAINTS:
  - <do NOT run build/test if a later Verify phase owns that>
  - <preserve existing behavior/markup/ids unless told otherwise>
  - <keep these exact strings/versions/APIs>
  - If you must deviate for correctness, DO it and note it in the report.

OUTPUT SCHEMA (structured — forces a machine-checkable return):
  {
    filesChanged: string[],
    summary: string,
    deviations: string
  }
```

---

## Why each field matters

- **FILE OWNERSHIP** is the single most important field for a parallel run. Disjoint ownership is
  what makes "run them at the same time in one repo" safe. State both halves — what to edit *and*
  what not to — because an agent that "helpfully" fixes a neighboring file causes the exact clobber
  you're trying to avoid.
- **CONSTRAINTS → don't run the build.** In a parallel build phase, every agent running `tsc`/`vite`
  simultaneously races and wastes tokens; worse, each compiles an *incomplete* tree. Centralize gates
  in the Verify phase.
- **OUTPUT SCHEMA.** Forcing a structured return (vs. free prose) makes the orchestrator's job
  trivial — it can branch on `findings.length`, collect `filesChanged`, etc. — and makes the agent
  validate its own output shape before returning (it retries on mismatch).
- **"Note deviations."** Agents *will* hit cases the spec didn't foresee. Telling them to deviate-and-
  report (rather than silently comply or silently improvise) surfaces the surprises instead of burying them.

---

## Phase archetypes (copy and specialize)

### Contract agent (runs alone, phase 1)
- Owns the upstream/shared artifact only.
- Task ends with: *"…then RETURN a precise markdown contract restating the exact shapes, names, and
  per-agent ownership that downstream agents will follow verbatim."*
- Output schema includes the `contract` string.

### Build agent (runs in parallel, phase 2)
- Strict disjoint ownership.
- Gets `SHARED_SPEC + CONTRACT_BLOCK + prior outputs`.
- Does **not** run gates. Returns `filesChanged + summary + deviations`.

### Verify agent (runs alone, phase 3)
- Runs the real gates; **repairs** drift across any file; iterates to green.
- Output schema: `{ lintPassed, buildPassed, lintTail, buildTail, fixesApplied }` — note the *tails*:
  return the actual command output as evidence.

### Review agent (read-only, phase 4)
- **Refute, don't confirm.** Prompt it to find what's broken; default to "suspicious" under uncertainty.
- Returns `{ findings: [{ title, severity: critical|major|minor, file, detail }] }`.
- The orchestrator filters `severity ∈ {critical, major}` and only then dispatches a repair.
