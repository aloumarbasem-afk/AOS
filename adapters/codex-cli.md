# Adapter — Codex CLI (and other headless CLI agents)

Codex CLI (`codex exec "<prompt>"`) runs one agent per invocation. Orchestrate the phases from a
**shell script** that drives Codex sequentially, with a real `&` fan-out for the parallel build phase.
The same approach works for any headless coding CLI (Gemini CLI, `aider`, etc.).

## Sketch

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO=/path/to/repo; cd "$REPO"

SHARED_SPEC="$(cat shared_spec.txt)"

# ── Phase 1: Contract (alone) ────────────────────────────────────────────────
codex exec "$SHARED_SPEC

Phase 1 — edit ONLY src/types.ts (the shared contract). <task...>
Then WRITE the prose contract to ./CONTRACT.md."
CONTRACT="$(cat CONTRACT.md)"

# ── Phase 2: Build (parallel — disjoint files, real background jobs) ─────────
codex exec "$SHARED_SPEC

$CONTRACT

Phase 2 BACKEND — edit ONLY server.ts, src/api-handler.ts. Do NOT touch App.tsx/types.ts. <task...>" &
PID_BE=$!
codex exec "$SHARED_SPEC

$CONTRACT

Phase 2 FRONTEND — edit ONLY src/App.tsx. Do NOT touch server/api-handler/types. <task...>" &
PID_FE=$!
wait $PID_BE $PID_FE    # barrier

# ── Phase 3: Verify + repair ────────────────────────────────────────────────
codex exec "$SHARED_SPEC

$CONTRACT

Phase 3 — run: npm run lint && npm run build. Fix any cross-file drift until BOTH are green. Do NOT commit."

# ── Phase 4: Adversarial review -> structured findings ──────────────────────
codex exec "$SHARED_SPEC

$CONTRACT

Phase 4 — READ ONLY. Refute the implementation; find silent failures/edge cases/contract violations.
Write findings as JSON to ./findings.json: [{title,severity,file,detail}]."

# Conditional repair (criticals/majors only)
if jq -e '[.[]|select(.severity!="minor")]|length>0' findings.json >/dev/null; then
  CRIT="$(jq -c '[.[]|select(.severity!="minor")]' findings.json)"
  codex exec "$SHARED_SPEC

$CONTRACT

Phase 4b — fix ONLY these confirmed issues: $CRIT
Re-run npm run lint && npm run build — keep green. Do NOT commit."
fi
```

## Key adaptations
- **Parallelism** is real OS-level `&` + `wait`. Because file ownership is disjoint, the two background
  Codex processes don't collide. (If they *would* share files, run each in its own `git worktree` and
  merge after — see the methodology's worktree note.)
- **The contract** is passed via a written file (`CONTRACT.md`) instead of an in-memory string.
- **Structured output** is faked with "write JSON to `findings.json`" + `jq` to branch — the shell is
  your orchestrator's `if`.
- Use each CLI's **sandbox / approval flags** appropriately; keep "do NOT commit/push" in every prompt so
  the human stays the integration gate.
