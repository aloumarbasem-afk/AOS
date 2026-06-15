# Adapter — generic orchestrator (LangGraph / custom / your own loop)

If you're building your own orchestration (LangGraph, a Python/TS script hitting an LLM API directly,
a queue of tool-calling agents), the playbook reduces to five primitives. Implement these and the
pattern is yours regardless of model or framework.

## The five primitives

| Primitive | Contract |
|-----------|----------|
| `run_agent(prompt, schema?) -> result` | One LLM agent turn with file tools. With a JSON schema, validate + retry until it conforms; return the parsed object. Without, return text. |
| `parallel(tasks) -> results[]` | Run tasks concurrently, await all (a barrier). A failing task → `null`, never throws the batch. |
| `phase(title)` | Just bookkeeping/telemetry; group agents for observability. |
| File ownership | Enforce (or at least instruct) that each parallel agent writes only its assigned paths. |
| Shared state | `SHARED_SPEC` (static) + `CONTRACT_BLOCK` (produced by phase 1) threaded into every prompt. |

## Reference control flow (framework-agnostic pseudocode)

```python
shared = SHARED_SPEC

# Phase 1 — Contract (alone)
contract = run_agent(shared + CONTRACT_TASK, schema=CONTRACT_SCHEMA)
block = f"\n=== CONTRACT (verbatim) ===\n{contract['contract']}\n=== END ===\n"

# Phase 2 — Build (parallel, disjoint ownership)
builds = parallel([
    lambda: run_agent(shared + block + BACKEND_TASK,  schema=FILE_REPORT),
    lambda: run_agent(shared + block + FRONTEND_TASK, schema=FILE_REPORT),
])

# Phase 3 — Verify + repair (alone; has shell access)
verify = run_agent(shared + block + VERIFY_TASK, schema=VERIFY_SCHEMA)   # runs gates, edits to green

# Phase 4 — Adversarial review (read-only) + conditional repair
review = run_agent(shared + block + REVIEW_TASK, schema=REVIEW_SCHEMA)
crit = [f for f in review["findings"] if f["severity"] != "minor"]
if crit:
    run_agent(shared + block + repair_prompt(crit))     # then re-run gates
```

## Design rules that survive any framework

1. **Barrier only where a downstream phase needs all upstream results.** Contract→Build and Build→Verify
   are genuine barriers (Verify needs the merged tree). If you have per-item work that *doesn't* need to
   sync, pipeline it instead of barriering — fast items shouldn't wait on slow ones.
2. **Schema-validate agent output at the boundary.** Don't parse free text. A JSON schema + retry turns
   "the model usually returns the right shape" into "the orchestrator can branch on it safely."
3. **Disjoint files > isolation.** Only reach for per-agent worktrees/sandboxes when agents genuinely
   contend on the same files; then add an explicit merge step.
4. **Verification is a node, not a vibe.** Run the real gates in their own step and feed failures back.
5. **Adversarial pass is cheap insurance.** One refute-prompted reviewer + conditional repair catches the
   silent failures generation is structurally blind to. Gate the repair on confirmed criticals so a clean
   run costs nothing extra.
6. **No silent caps.** If you bound fan-out (top-N, sampling, no-retry), log what you dropped.
