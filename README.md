# sweep-adjoint

Installable TypeScript library for **sweep-adjoint** differentiation: differentiate the block-implicit solver that ran, not the equation.

- **Maintainer:** Luke Horn ([nyfeblade](https://github.com/nyfeblade), `hornsons21@gmail.com`)
- **Math:** Shu et al., *Differentiate the Solver, Not the Equation*, [arXiv:2608.08559](https://arxiv.org/abs/2608.08559)
- **Visualizer / proofs:** [sweep-adjoint-visualizer](https://github.com/nyfeblade/sweep-adjoint-visualizer)

The backward pass **is** the forward block-implicit sweep run in reverse-color order. Local 3×3 blocks in the paper; this library uses the same object as a 2×2 slice. Not a production differentiable physics engine.

## Install

```bash
npm install sweep-adjoint
```

Node **20+**. ESM only (`import`, not `require`).

## Why this exists

Unrolled AD tapes the stepper. Memory grows with K. Equation-level IFT (Neural ODE / DEQ / optimization layers) differentiates the fixed point, not the finite solver that ran. At K=1, IFT is wrong — tens of percent off.

Sweep-adjoint is the reverse-colored Gauss–Seidel of the energy-minimizing sweep that actually executed. It matches the tape and central finite differences. Workspace is O(N), independent of K.

## Usage

```ts
import {
  createK1ProofCloth,
  cloneCloth,
  copyF64,
  forwardSweeps,
  sweepAdjoint,
  unrolledAdjoint,
  iftAdjoint,
  proveK1,
} from "sweep-adjoint";

// Thesis check: K=1, sweep ≈ FD/tape, IFT wrong.
const proof = proveK1();
console.log(proof.ok, proof.sweepVsFd, proof.iftVsFd);

const cloth = createK1ProofCloth();
const x0 = copyF64(cloth.x);
forwardSweeps(cloneCloth(cloth), 1);

const tape = unrolledAdjoint(cloneCloth(cloth), 1);
const sweep = sweepAdjoint(cloneCloth(cloth), 1, x0);

cloth.x.set(x0);
forwardSweeps(cloth, 1);
const { adj: ift } = iftAdjoint(cloth);
```

`sweepAdjoint` rematerializes each of the K sweeps from `x0` and reverses the local 2×2 (paper: 3×3) block in reverse checkerboard order. `unrolledAdjoint` is the O(K·N) tape twin. `iftAdjoint` inverts the energy Hessian as if the residual were zero.

Empty mesh and K=0 throw `SweepAdjointError` (`empty_mesh` / `k_zero`). Those are first-class failures of the primitive, not no-ops.

## Public API

| Export | Role |
| --- | --- |
| `forwardSweeps(state, K)` | Block-implicit colored VBD sweep |
| `sweepAdjoint(state, K, x0)` | Reverse-color local-block adjoint |
| `unrolledAdjoint(state, K)` | Tape-twin unrolled AD |
| `iftAdjoint(state)` | Equation-level IFT (global Hessian / CG) |
| `proveK1()` | Central FD vs tape vs sweep vs IFT on the 10×10 fixture |
| `SweepAdjointError` | `empty_mesh` and `k_zero` |

Helpers: `createCloth`, `createK1ProofCloth`, `createEmptyMesh`, `cloneCloth`, `fdForceGrad`, `runExplainer`, `probeLoss`, memory workspace sizes.

## Checks

```bash
npm install
npm run build
npm test
npm run check:math
```

`check:math` prints ∂L/∂p (handle force_x) four ways after **one** VBD sweep on a 10×10 grid. Pass when:

- Tape / unrolled AD matches central FD
- Sweep-adjoint matches tape and FD (~1e-7)
- Standard IFT is **wrong** at K=1 (relative error > 8%)

That is the paper: differentiate the solver that ran, not the equation.

## Visualizer

This package is the library. The interactive cloth demo, K=1 proof page, and memory bars live in [sweep-adjoint-visualizer](https://github.com/nyfeblade/sweep-adjoint-visualizer). Math here is ported from that repo's `lib/sweep-adjoint/` on main.

## License

MIT. Implementation by Luke Horn. Math credit to Shu et al., [arXiv:2608.08559](https://arxiv.org/abs/2608.08559).
