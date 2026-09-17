import { SweepAdjointError, type SolverErrorCode } from "./errors.js";
import { probeLoss } from "./energy.js";
import { cloneCloth, createCloth, createEmptyMesh, resetToRest, vertexIndex } from "./mesh.js";
import { forwardSweeps, runExplainer } from "./solver.js";
import type { ClothState } from "./types.js";

/** Same 10×10 handle/probe pairing as the visualizer `scripts/verify_k1.py`. */
export const K1_PROOF_GRID = 10;
export const K1_PROOF_SWEEPS = 1;
export const K1_PROOF_EPS_FD = 1e-5;
export const K1_PROOF_PASS_ABS = 1e-7;
export const K1_PROOF_PASS_REL = 1e-5;
export const K1_PROOF_IFT_MIN_REL = 0.08;

export type K1Proof = {
  grid: number;
  sweeps: number;
  param: "handle force_x";
  fd: number;
  sweep: number;
  ift: number;
  unrolled: number;
  sweepVsFd: number;
  iftVsFd: number;
  sweepVsUnrolled: number;
  iftVsSweep: number;
  loss: number;
  ok: boolean;
};

export const K1_PROOF_SCHEMA = "sweep-adjoint/k1-proof/v1" as const;

export type K1ProofArtifact = K1Proof & {
  schema: typeof K1_PROOF_SCHEMA;
  thesis: "sweep ≈ FD/tape; IFT wrong at K=1";
};

export type GateCheck = { ok: boolean; code?: SolverErrorCode };

export type K1Gate = {
  emptyMesh: GateCheck;
  kZero: GateCheck;
  proof: K1Proof;
  ok: boolean;
};

/** Durable, JSON-serializable proof record for CI / FACTORY.md. */
export function serializeK1Proof(proof: K1Proof): K1ProofArtifact {
  return {
    schema: K1_PROOF_SCHEMA,
    thesis: "sweep ≈ FD/tape; IFT wrong at K=1",
    ...proof,
  };
}

function caughtSolverCode(run: () => void): GateCheck {
  try {
    run();
    return { ok: false };
  } catch (error) {
    if (error instanceof SweepAdjointError) {
      return { ok: true, code: error.code };
    }
    return { ok: false };
  }
}

/** Empty-mesh + K=0 errors and the K=1 thesis, one call for Proof / CLI. */
export function runK1Gate(): K1Gate {
  const emptyMesh = caughtSolverCode(() => {
    runExplainer(createEmptyMesh(), 1);
  });
  const kZero = caughtSolverCode(() => {
    runExplainer(createCloth(4, 4), 0);
  });
  const proof = proveK1();
  const emptyOk = emptyMesh.ok && emptyMesh.code === "empty_mesh";
  const kZeroOk = kZero.ok && kZero.code === "k_zero";
  return {
    emptyMesh: { ok: emptyOk, code: emptyMesh.code },
    kZero: { ok: kZeroOk, code: kZero.code },
    proof,
    ok: emptyOk && kZeroOk && proof.ok,
  };
}

/** Human-readable K=1 gate table (FACTORY.md proof artifact companion). */
export function formatK1GateReport(gate: K1Gate): string {
  const { proof } = gate;
  const mark = (ok: boolean) => (ok ? "ok   " : "FAIL ");
  const tapeVsFd = Math.abs(proof.unrolled - proof.fd) / Math.max(Math.abs(proof.fd), 1e-12);
  const lines = [
    `${mark(gate.emptyMesh.ok)} empty mesh → SweepAdjointError(${gate.emptyMesh.code ?? "missing"})`,
    `${mark(gate.kZero.ok)} K=0 → SweepAdjointError(${gate.kZero.code ?? "missing"})`,
    "",
    "K=1 verification  ·  10×10 VBD mass-spring  ·  ONE sweep",
    "p = handle force_x    L = ½‖x_probe − rest‖²",
    "",
    `${"method".padEnd(24)} ${"∂L/∂p".padStart(14)} ${"vs FD".padStart(10)}`,
    "-".repeat(52),
    `${"Central FD (gold)".padEnd(24)} ${proof.fd.toExponential(8).padStart(14)} ${"0.00e+0".padStart(10)}`,
    `${"Tape / unrolled AD".padEnd(24)} ${proof.unrolled.toExponential(8).padStart(14)} ${tapeVsFd.toExponential(2).padStart(10)}`,
    `${"Standard IFT".padEnd(24)} ${proof.ift.toExponential(8).padStart(14)} ${proof.iftVsFd.toExponential(2).padStart(10)}`,
    `${"Sweep-adjoint".padEnd(24)} ${proof.sweep.toExponential(8).padStart(14)} ${proof.sweepVsFd.toExponential(2).padStart(10)}`,
    "",
    `sweep vs tape  ${proof.sweepVsUnrolled.toExponential(2)}`,
    `IFT vs sweep   ${proof.iftVsSweep.toFixed(3)}`,
  ];
  return lines.join("\n");
}

export function createK1ProofCloth(): ClothState {
  const cloth = createCloth(K1_PROOF_GRID, K1_PROOF_GRID);
  // Same pairing as scripts/verify_k1.py: handle is even, probe is the odd
  // neighbor, so one sweep couples p → x_handle → x_probe. Default createCloth
  // handle/probe is a same-color +2 hop — ∂L/∂p is exactly 0 at K=1.
  cloth.handle = vertexIndex(3, 1, K1_PROOF_GRID);
  cloth.probe = vertexIndex(4, 1, K1_PROOF_GRID);
  cloth.targetX = cloth.rest[2 * cloth.handle] + 1.6;
  cloth.targetY = cloth.rest[2 * cloth.handle + 1] - 1.8;
  return cloth;
}

/** Central finite difference of probe loss w.r.t. a vertex force component. */
export function fdForceGrad(
  state: ClothState,
  sweeps: number,
  vertex: number,
  axis: 0 | 1,
  eps = K1_PROOF_EPS_FD,
): number {
  const idx = 2 * vertex + axis;
  const orig = state.force[idx];
  resetToRest(state);
  state.force[idx] = orig + eps;
  forwardSweeps(state, sweeps);
  const lp = probeLoss(state);
  resetToRest(state);
  state.force[idx] = orig - eps;
  forwardSweeps(state, sweeps);
  const lm = probeLoss(state);
  state.force[idx] = orig;
  resetToRest(state);
  return (lp - lm) / (2 * eps);
}

function vsFd(value: number, fd: number): number {
  return Math.abs(value - fd) / Math.max(Math.abs(fd), 1e-12);
}

/**
 * K=1 ∂L/∂p on the verify_k1 10×10 fixture, via the same `runExplainer` + FD
 * path as `npm run check:math`. p is handle force_x.
 */
export function proveK1(): K1Proof {
  const cloth = createK1ProofCloth();
  const explained = runExplainer(cloneCloth(cloth), K1_PROOF_SWEEPS);
  const pIndex = 2 * cloth.handle;
  const fd = fdForceGrad(cloneCloth(cloth), K1_PROOF_SWEEPS, cloth.handle, 0);
  const sweep = explained.sweepAdj[pIndex];
  const ift = explained.iftAdj[pIndex];
  const unrolled = explained.unrolledAdj[pIndex];
  const sweepVsFd = vsFd(sweep, fd);
  const iftVsFd = vsFd(ift, fd);
  const sweepOk = Math.abs(sweep - fd) < K1_PROOF_PASS_ABS || sweepVsFd < K1_PROOF_PASS_REL;
  const tapeOk = explained.sweepVsUnrolled < 1e-8;
  const iftWrong = iftVsFd > K1_PROOF_IFT_MIN_REL;

  return {
    grid: K1_PROOF_GRID,
    sweeps: K1_PROOF_SWEEPS,
    param: "handle force_x",
    fd,
    sweep,
    ift,
    unrolled,
    sweepVsFd,
    iftVsFd,
    sweepVsUnrolled: explained.sweepVsUnrolled,
    iftVsSweep: explained.iftVsSweep,
    loss: explained.loss,
    ok: sweepOk && tapeOk && iftWrong,
  };
}
