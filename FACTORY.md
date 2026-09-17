# Sweep Eng — factory OS

Mini-org operating system for **sweep-adjoint**. Inspired by xAI Grok Bot for Engineering and [pstack](https://github.com/poteto/pstack) (orchestrate / poteto-mode): a Lead that never writes the code, CloudAgents that do, and a closed loop that refuses chat-as-memory.

This repo is the **library**. The one consumer is [sweep-adjoint-visualizer](https://github.com/nyfeblade/sweep-adjoint-visualizer). Math: Shu et al., *Differentiate the Solver, Not the Equation*, [arXiv:2608.08559](https://arxiv.org/abs/2608.08559). Implementation and factory: **Luke Horn** ([nyfeblade](https://github.com/nyfeblade)).

Read this before spawning work. `AGENTS.md` points here.

## Roles

Five standing seats. Overflow is not a sixth seat.

| Role | Owns | Does not |
| --- | --- | --- |
| **Lead** | Orchestration. Briefs CloudAgents. Drains completions. Keeps the frontier green. Human report. | Write library code. Merge without Proof. Treat chat as the backlog. |
| **Core** | `src/`. Public API, types, ESM package, `dist/`. | Visualizer UI. Shipping a change that fails the K=1 gate. |
| **Proof** | Falsify. Central FD vs tape vs sweep vs IFT. Empty mesh / K=0. Memory hold vs K. | Rubber-stamp Core. Accept “looks right” without an artifact. |
| **Integrator** | **One** consumer: the visualizer. Port or pin. Report API friction. | A second consumer, a framework, or a monorepo expansion. |
| **Ops** | 1:1s, postmortems, cadence, access. Encode lessons into this file. | Silent process edits. Drive-by refactors. |

**SOTA overflow** (reuse, do not reinvent): when the Grok / default CloudAgent queue is saturated, or the unit is judgment / prose / hardest math, overflow to pstack SOTA (fable / sol / opus — whatever `/setup-pstack` has mapped). Same brief template. Same Proof bar. Capacity and model-family routing, not a new org chart.

Lead maps 1:1 to pstack **Orchestrate** (coordinator). Core / Proof / Integrator are cloud workers. Ops is the human + Lead 1:1, plus the postmortem store.

## Rules

1. **CloudAgent executes code.** Lead and Grok Bots do not edit `src/` in the supervisor chat. They write briefs and merge verified units. The agent in the worktree runs `npm run build`, `npm test`, and `npm run check:math`.
2. **Bots supervise.** Standing Grok Bots (or pstack Lead) run the loops below. They wake CloudAgents; they do not become the CloudAgent.
3. **Require proof artifacts.** A Core PR is not done until Proof can point at a durable artifact: `npm run check:math` output and/or `artifacts/k1-proof.json` (`schema: sweep-adjoint/k1-proof/v1`). CI logs count. A screenshot of a passing terminal does not.
4. **Closed feedback loop.** Brief → CloudAgent → CI + proof artifact → Proof verdict → Lead lands or respawns. Completions are queue events, not interrupts. No open-loop “ship and hope.”
5. **Chat ≠ backlog.** If it should outlive the thread, it is a GitHub issue or PR, linked from chat. No naked “we should…” without a URL. Issue template: `.github/ISSUE_TEMPLATE/factory.md`.
6. **K=1 gate stays green.** `proveK1().ok === true`: sweep ≈ central FD and tape; IFT is **wrong** at K=1 (rel > 8%). Empty mesh and K=0 throw `SweepAdjointError`. A red K=1 gate is a stop-the-line P0. Do not “fix forward” by relaxing thresholds.

## Loops

### Morning alignment (Lead)

Paste into the supervisor bot:

```
Sweep Eng morning alignment. Read FACTORY.md and AGENTS.md.
1. List open issues and PRs in nyfeblade/sweep-adjoint (and visualizer only if Integrator has an open link).
2. K=1 gate: latest main CI + last artifacts/k1-proof.json or check:math log. Green or P0.
3. Name today's units. One CloudAgent per unit. Briefs: GOAL, SCOPE, ACCEPTANCE, VERIFY (npm run build && npm test && npm run check:math), REPORT.
4. Chat is not the backlog — link issues/PRs. Spawn; do not implement in this chat.
```

### PR patrol (Lead + Proof)

CI, conflicts, proof. Default: each open PR, each new head SHA.

```
Sweep Eng PR patrol. For every open PR on nyfeblade/sweep-adjoint:
- CI status on the head SHA. Failures → spawn Core with the log, do not patch in chat.
- Merge conflicts → spawn Core to rebase on main.
- Proof: check:math / artifacts/k1-proof.json on this SHA. Missing artifact → request it.
- Review comments unanswered → spawn the owning role.
Report a table: PR, SHA, CI, proof, conflicts, next action. Link everything.
```

### Nightly audit (optional)

Run only when Lead wants a paper trail, not every calendar night.

```
Sweep Eng nightly audit (optional). Read FACTORY.md.
Audit the last 24h of merged PRs and failed CI.
Did any landing skip a proof artifact? Did K=1 stay green? Did chat create work with no issue/PR?
Write a short Ops note: what to encode into FACTORY.md, what to ignore. Do not open drive-by cleanup PRs.
```

## P0

P0 = K=1 gate red, empty-mesh / K=0 regressions, publish-breaking ESM/types, or a wrong gradient that still “passes” by a loosened threshold.

On P0, **denser CloudAgent checks**:

- Do not wait for morning / nightly. Patrol on every push, every CI event, every review comment.
- Spawn Proof on the failing SHA immediately, in parallel with Core.
- No batched “look at all PRs later.” One failing head is the whole queue until green.
- Overflow to SOTA if the default CloudAgent is already busy. Do not serialize behind a green unit.

## Proof bar (this package)

```bash
npm run build
npm test
npm run check:math          # writes artifacts/k1-proof.json
# or, after build:
npx sweep-adjoint-check
```

Pass when, on the 10×10 K=1 fixture (handle force_x):

- Tape matches central FD
- Sweep-adjoint matches tape and FD (~1e-7)
- IFT is wrong at K=1
- Empty mesh → `SweepAdjointError("empty_mesh")`
- K=0 → `SweepAdjointError("k_zero")`

That is the paper: differentiate the solver that ran, not the equation.

## Brief template (Lead → CloudAgent)

```
GOAL         one sentence
SCOPE        paths you may write; paths you may not
CONTEXT      issue/PR URLs; FACTORY.md; upstream reports inlined
ACCEPTANCE   checkable lines, including K=1 gate
VERIFY       npm run build && npm test && npm run check:math
FORBIDDEN    no relaxing K=1 thresholds; no second consumer; no Next.js UI in this repo
REPORT       SHA, PR, proof artifact path or CI URL, deviations
```

## Credit

- **Factory / library:** Luke Horn ([nyfeblade](https://github.com/nyfeblade))
- **Math:** Shu et al., [arXiv:2608.08559](https://arxiv.org/abs/2608.08559)
- **Org pattern:** xAI Grok Bot for Engineering; pstack Orchestrate / poteto-mode (roles, briefs, closed loop)
- **Demo:** [sweep-adjoint-visualizer](https://github.com/nyfeblade/sweep-adjoint-visualizer)
