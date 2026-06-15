# Adapter — Claude Code

This pattern is **native** to Claude Code via the `Workflow` tool. The
[`templates/workflow-skeleton.js`](../templates/workflow-skeleton.js) and
[the AOS workflow](../workflows/aos-sse-pipeline-refactor.workflow.js) are written in exactly this dialect.

## Running a workflow

1. Author the script (start from `templates/workflow-skeleton.js`).
2. Invoke the `Workflow` tool with the script inline (or `{ scriptPath }` to iterate on a saved file).
3. It runs in the background; you get a task notification on completion. Watch live with `/workflows`.

The harness persists every run's script under the session dir and returns the path — edit that file
and re-invoke with `{ scriptPath }` to iterate without resending.

## API surface

| Call | Meaning |
|------|---------|
| `agent(prompt, {label, phase, schema, model, isolation, agentType})` | Spawn a subagent. With `schema` (JSON Schema) it returns a validated object; without, the final text string. `null` if it dies/skips — `.filter(Boolean)`. |
| `parallel(thunks)` | BARRIER: run all concurrently, await all. A throwing thunk → `null` in the result array. |
| `pipeline(items, stage1, stage2, …)` | Per-item staged flow with **no** barrier between stages — use when stages don't need to sync. |
| `phase(title)` | Group subsequent agents under a progress heading. |
| `log(msg)` | Narrator line to the user. |
| `budget` / `args` | Token target + the value passed as Workflow `args`. |

## Mapping the playbook to the tool

- **Contract phase** → a single `await agent(..., {schema: CONTRACT_SCHEMA})`. Capture `.contract`.
- **Build phase** → `await parallel(BUILD_AGENTS.map(a => () => agent(...)))`. Disjoint file ownership
  in each prompt means same-tree concurrency is safe — **don't** use `isolation:'worktree'` unless
  agents must edit the same files.
- **Verify phase** → a single agent with `Bash` access that runs the gates and repairs.
- **Review phase** → a single read-only `agent(..., {schema: REVIEW_SCHEMA})`, then a JS `if` on
  `findings.filter(f => f.severity!=='minor')` to conditionally dispatch repair.

## Gotchas

- Scripts are plain JS, not TS — no type annotations. `Date.now()`/`Math.random()`/argless `new Date()`
  throw (they'd break resume); vary by index instead, stamp time after the run.
- Concurrency caps at ~`min(16, cores-2)`; excess `parallel`/`pipeline` items queue automatically.
- `meta` must be a pure literal (no variables/among interpolation). Phase titles in `meta.phases`
  should match your `phase()` calls.
- Resume: relaunch with `{ scriptPath, resumeFromRunId }` — unchanged prefix agents return cached results.

## When NOT to use Workflow

Single-file edits, conversational answers, anything trivial. The tool is for genuine fan-out /
verification / scale. (It also requires explicit user opt-in.)
