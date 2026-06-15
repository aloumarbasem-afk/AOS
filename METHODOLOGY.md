# Methodology — how to decide the workflow

This is the reasoning the orchestrator goes through *before* writing a single agent prompt.
The mechanics (spawn, parallel, schema) are easy; the decisions below are where quality lives.

---

## Step 0 — Should this be a workflow at all?

Multi-agent orchestration has real overhead (token cost, coordination, merge risk). Use it when
**at least one** of these is true:

- **Decomposable & parallel** — the task splits into chunks that can progress independently.
- **Needs confidence** — correctness matters enough to want independent verification / an adversarial pass.
- **Too big for one context** — a migration/audit/sweep that won't fit in a single agent's working set.

If none hold — a single small edit, a one-file fix, a conversational answer — **do it inline.**
Don't spin up a fleet to change a constant.

> In the worked example the trigger was *"increase efficiency"* on a 4-file refactor: the files
> split cleanly into independent domains, so parallelism was a real win, and an LLM-generated
> streaming protocol is exactly the kind of plausible-but-wrong output that wants an adversarial check.

---

## Step 1 — Map the dependency graph, then find the seams

List the artifacts the task touches and draw the *reads/writes* edges between them. The seams —
the cut points with the fewest crossing edges — become your phase and ownership boundaries.

Worked example (4 files):

```
types.ts  ──imported by──▶ api-handler.ts ──used by──▶ server.ts        (backend domain)
   │
   └──────────imported by──▶ App.tsx                                     (frontend domain)

backend ⇄ frontend communicate ONLY via the HTTP/SSE JSON contract — which is defined in types.ts
```

Two facts fall out of the graph:

1. **`types.ts` is upstream of everything** → it must be written *first*, alone. It is the contract.
2. **Backend and frontend share no files and talk only through the contract** → once the contract
   exists, they can be built **in parallel** with zero merge risk.

**Principle:** *parallelism is a property of the dependency graph, not a preference.* You don't
choose to parallelize; you discover where the graph already lets you.

---

## Step 2 — Contract first (the barrier that makes parallelism safe)

Independent agents working toward a shared interface **will diverge** unless they share one
written source of truth. So Phase 1 is always a single agent that produces:

- the **durable artifact** every downstream agent imports (here: `types.ts` with the event union), and
- a **written contract** (returned as text) restating the exact shapes, names, and ownership, which
  is injected verbatim into every Phase-2 prompt.

Why both? The code artifact enforces it at compile time; the prose contract removes ambiguity at
*generation* time, before the compiler ever runs. Belt and suspenders.

This phase is a **hard barrier**: nothing downstream starts until the contract exists.

---

## Step 3 — Build in parallel, with STRICT disjoint file ownership

Each Phase-2 agent is told **exactly which files it may edit** and explicitly **which files it may
not touch**. Because ownership is disjoint, the agents run concurrently in the *same working tree*
with no conflicts — no git worktrees, no merge step.

> **Worktrees vs. disjoint ownership.** Worktrees isolate agents that *must* edit the same files in
> parallel, but they cost setup time + disk + a merge. If you can partition the file set instead,
> do that — it's strictly cheaper. Reserve worktrees for genuine same-file contention.

Each agent also gets the **accumulated prior output** (the contract, plus any earlier results) so
later work stays consistent with earlier decisions. Sequential context-chaining *inside* the graph;
parallel execution *across* independent branches.

Rules every build agent gets:
- Edit only your files; do not touch the others'.
- Do **not** run the build/test (that's the verify phase — avoids races and wasted work).
- Return a structured report (files changed, summary, deviations).

---

## Step 4 — Verify as its own phase (catch integration drift)

Parallel agents each pass *their own* mental model but can disagree at the boundary (a renamed
field, a slightly different shape). A single agent now runs the **real gates** — typecheck, build,
tests — and **repairs** any cross-agent drift, editing whichever file is wrong, until green.

This is the cheapest place to catch integration errors: one authoritative compile over the merged
result. Never let a build agent self-certify "it compiles" — it didn't run the compiler on the
*combined* tree.

**Principle:** *evidence over assertion.* The phase returns the actual gate output, not a claim.

---

## Step 5 — Adversarial review (what generation is blind to)

Generation optimizes for *plausible*; it does not optimize for *correct under failure*. So a final
**read-only** agent is prompted to **refute** — to hunt silent failures, unhandled edge cases,
contract violations, and "looks fine but breaks when X." It returns findings with severity.

Then **conditionally**: if (and only if) it found critical/major issues, dispatch a repair agent
for exactly those, and re-verify. No findings → spend nothing.

> In the worked example this phase earned its keep: it found that if the *first* agent in the
> streamed pipeline failed, the entire dashboard stayed hidden and the user-facing error never
> rendered — a silent failure no amount of "does it compile" would surface. Auto-repaired, re-verified.

Variations worth knowing:
- **Perspective-diverse verify** — give N reviewers *different lenses* (correctness, security, perf,
  does-it-actually-reproduce) instead of N identical skeptics.
- **Majority-vote refute** — for high-stakes claims, spawn 3 skeptics; kill the finding only if a
  majority refute it. Defaults to "refuted" under uncertainty.
- **Loop-until-dry** — for unknown-size discovery, keep finding until K consecutive rounds find nothing new.

---

## Decision table — task properties → workflow structure

| If your task… | …then |
|---|---|
| Has a shared interface multiple parts depend on | Make a **Contract** phase 1; write the artifact + return a prose contract. |
| Splits into file-disjoint domains | **Parallel** build agents with strict ownership; **no** worktrees. |
| Forces multiple agents onto the *same* files | Use **worktree isolation** per agent + an explicit merge step. |
| Has real gates (typecheck/build/tests) | A dedicated **Verify+repair** phase; agents don't self-certify. |
| Is correctness-sensitive / LLM-generated logic | An **adversarial Review** phase; conditional repair on criticals only. |
| Has unknown-size discovery (bugs, call sites) | **Loop-until-dry**; log anything you cap. |
| Is a quick single-file change | **No workflow** — do it inline. |

---

## Anti-patterns (smells that you decomposed wrong)

- **Barrier where a pipeline would do.** If stage N only needs *its own* item from stage N-1, don't
  synchronize the whole batch — pipeline it so fast items don't wait on slow ones.
- **Parallel agents on overlapping files without worktrees.** Guaranteed clobber. Partition or isolate.
- **Skipping the contract.** Parallel agents invent slightly different interfaces; verify becomes a rewrite.
- **Trusting "done."** A closed socket / API hiccup can return a `completed`-looking result with near-zero
  work. Check the artifact exists on disk and the gate is green before integrating.
- **Silent caps.** If you bound coverage (top-N, no-retry, sampling), `log()` what was dropped — otherwise
  "covered everything" is a lie by omission.
