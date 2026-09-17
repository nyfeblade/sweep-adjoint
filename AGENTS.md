# Agents

Sweep Eng lives in [`FACTORY.md`](./FACTORY.md). Read it before you write code or spawn work.

- **This repo** is the npm library (`sweep-adjoint`). No Next.js UI.
- **Lead** orchestrates. **CloudAgents** execute. Bots supervise.
- **Proof artifact** required: `npm run check:math` (writes `artifacts/k1-proof.json`) or CI log of the same.
- **K=1 gate must stay green.** Do not relax thresholds to get a pass.
- **Chat ≠ backlog.** Link a GitHub issue or PR.

```bash
npm run build && npm test && npm run check:math
```
