# Multi-Agent Workflow Playbook

A **tool-agnostic playbook** for decomposing a non-trivial coding task into a deterministic
multi-agent workflow: how to decide *which* agents, *in what order*, with *what isolation*,
and *how to verify* the result — plus reusable agent templates, the actual orchestration
script, and adapters for running the same pattern in Claude Code, Cursor, Codex CLI, or any
custom orchestrator.

It was extracted from a real run: refactoring a single-shot LLM "architecture planner" web app
into a **streaming 4-agent SSE pipeline**. That run is preserved verbatim as a worked example so
the abstractions stay grounded in something that actually shipped (lint + build green, one real
bug caught by the adversarial pass).

---

## Why this exists

Most "use multiple agents" advice stops at *"spawn some agents in parallel."* The hard part is
the **decomposition decision**: where are the seams, what must be sequential, what can run
concurrently without conflict, and how do you stop plausible-but-wrong output from shipping.

This playbook encodes the decision framework, not just the mechanics.

## The shape (4 phases, generalizes to most build/refactor tasks)

```
        ┌──────────────────────────────────────────────────────────────┐
        │  Phase 1 — CONTRACT     1 agent, writes the shared source of   │
        │                         truth all later agents depend on       │
        └───────────────┬──────────────────────────────────────────────┘
                        │  (hard barrier — everything below reads it)
        ┌───────────────▼──────────────────────────────────────────────┐
        │  Phase 2 — BUILD        N agents in PARALLEL, each owning a    │
        │                         DISJOINT set of files (no conflict)    │
        └───────────────┬──────────────────────────────────────────────┘
                        │  (barrier — collect all edits)
        ┌───────────────▼──────────────────────────────────────────────┐
        │  Phase 3 — VERIFY       1 agent runs the real gates           │
        │                         (typecheck/build/test) and repairs    │
        │                         cross-agent drift until green          │
        └───────────────┬──────────────────────────────────────────────┘
                        │
        ┌───────────────▼──────────────────────────────────────────────┐
        │  Phase 4 — REVIEW       1 adversarial agent hunts silent      │
        │                         failures; conditionally dispatch a     │
        │                         repair + re-verify ONLY if criticals   │
        └──────────────────────────────────────────────────────────────┘
```

Read **[METHODOLOGY.md](./METHODOLOGY.md)** for *why* each phase is shaped this way and a
decision table mapping task properties → workflow structure.

## Repo map

| Path | What it is |
|------|------------|
| [`METHODOLOGY.md`](./METHODOLOGY.md) | The decision framework — how to choose agents, ordering, isolation, verification. |
| [`templates/agent-template.md`](./templates/agent-template.md) | A fill-in-the-blanks spec for a single agent (role, inputs, file ownership, output schema, constraints). |
| [`templates/workflow-skeleton.js`](./templates/workflow-skeleton.js) | A parameterized, generic version of the orchestration script — start here for a new task. |
| [`workflows/aos-sse-pipeline-refactor.workflow.js`](./workflows/aos-sse-pipeline-refactor.workflow.js) | The **actual script that was run**, verbatim. |
| [`examples/aos-sse-refactor/CASE_STUDY.md`](./examples/aos-sse-refactor/CASE_STUDY.md) | The worked example: task, decisions, results, the real bug the adversarial pass caught. |
| [`examples/aos-sse-refactor/the-prompt-i-ran.md`](./examples/aos-sse-refactor/the-prompt-i-ran.md) | Every prompt that was sent to every agent, copy-pasteable. |
| [`adapters/`](./adapters/) | How to run this pattern in **Claude Code**, **Cursor**, **Codex CLI**, and any **generic orchestrator**. |

## Quickstart for a new task

1. Read `METHODOLOGY.md` and fill in the decision table for your task.
2. Copy `templates/workflow-skeleton.js`, set your phases/agents/file-ownership.
3. Copy `templates/agent-template.md` once per agent; write the shared spec + per-agent task.
4. Run it via the adapter for your tool (`adapters/<tool>.md`).
5. Keep the VERIFY and REVIEW phases — they are where correctness actually comes from.

## Core principles (the one-screen version)

- **Find the seams, then split.** Parallelism follows the dependency graph, not wishful thinking.
- **Contract first.** Parallel agents diverge unless they share one written source of truth.
- **Disjoint file ownership beats worktrees.** If agents touch non-overlapping files, they can
  run concurrently in the same tree with zero merge cost.
- **Verification is a phase, not a footnote.** Run the real gates; repair integration drift.
- **Adversarial review catches what generation can't.** An independent skeptic prompted to *refute*
  finds silent failures the builder is blind to. Spend repair tokens only on confirmed criticals.
- **Evidence over assertion.** "Done" means the gate output is pasted, not asserted.

## License

MIT — see [LICENSE](./LICENSE).
