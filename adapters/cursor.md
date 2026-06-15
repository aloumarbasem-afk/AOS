# Adapter — Cursor

Cursor has no deterministic multi-agent orchestrator, so you run the phases **as a structured
sequence of scoped prompts** (Composer / Agent mode), using the human (you) as the barrier between
phases. The discipline that makes it work is the same: contract first, disjoint file scope, verify, review.

## Mapping

### Phase 1 — Contract (one Composer session)
- Scope the session to the shared artifact only (e.g. `@types.ts`).
- Prompt: paste your `SHARED_SPEC` + the Contract task. Ask it to **also output the prose contract**
  as a markdown block in chat. **Copy that contract** — it's your `CONTRACT_BLOCK` for every later prompt.

### Phase 2 — Build (two Composer sessions = your "parallel")
- Cursor's **background agents** can run concurrently; if available, launch backend and frontend as two
  background agents. Otherwise run them as two sequential Composer sessions — still benefits from
  disjoint scope.
- Each session: `@`-scope it to **only** that domain's files, and in the prompt paste
  `SHARED_SPEC + CONTRACT_BLOCK + the per-agent task`, including the explicit "MUST NOT touch <other files>".
- Cursor respects `@`-mentioned context strongly; naming exactly the owned files keeps it in lane.

### Phase 3 — Verify (one session + your terminal)
- Run the real gates in Cursor's terminal (`tsc --noEmit`, build, tests).
- Paste failures back into a Composer session scoped to all four files and ask it to repair to green.

### Phase 4 — Review (one session, read-mostly)
- New Composer/Chat session. Prompt it to **refute** (paste the Review task + the focus list).
- For criticals it finds, run a focused repair session, then re-run gates.

## Tips
- Use a `.cursor/rules` file to pin the `SHARED_SPEC` + contract so every session inherits it without re-paste.
- Cursor tends to "helpfully" edit neighboring files — the explicit MUST-NOT-TOUCH line matters more here
  than in a tool with hard file ownership.
- Keep the verify/review separation: don't let the build session declare success; run the gate yourself.
