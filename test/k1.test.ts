import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCloth,
  createK1ProofCloth,
  fdForceGrad,
  K1_PROOF_SCHEMA,
  proveK1,
  runExplainer,
  runK1Gate,
  serializeK1Proof,
} from "../src/index.ts";

test("K=1: sweep-adjoint matches FD and tape; IFT is wrong", () => {
  const proof = proveK1();
  assert.equal(proof.sweeps, 1);
  assert.equal(proof.grid, 10);
  assert.ok(
    proof.ok,
    `fd=${proof.fd} sweep=${proof.sweep} tape=${proof.unrolled} ift=${proof.ift} sweepVsFd=${proof.sweepVsFd} iftVsFd=${proof.iftVsFd}`,
  );
  assert.ok(proof.sweepVsFd < 1e-5 || Math.abs(proof.sweep - proof.fd) < 1e-7);
  assert.ok(proof.sweepVsUnrolled < 1e-8);
  assert.ok(proof.iftVsFd > 0.08);
});

test("K=1 gate + proof artifact schema", () => {
  const gate = runK1Gate();
  assert.ok(gate.ok);
  assert.equal(gate.emptyMesh.code, "empty_mesh");
  assert.equal(gate.kZero.code, "k_zero");
  const artifact = serializeK1Proof(gate.proof);
  assert.equal(artifact.schema, K1_PROOF_SCHEMA);
  assert.equal(artifact.ok, true);
  assert.equal(artifact.thesis, "sweep ≈ FD/tape; IFT wrong at K=1");
});

test("sweep matches unrolled at K=32", () => {
  const k32 = runExplainer(createK1ProofCloth(), 32);
  assert.ok(k32.sweepVsUnrolled < 1e-7, `rel ${k32.sweepVsUnrolled}`);
});

test("IFT moves toward sweep as K grows", () => {
  const k1 = proveK1();
  const k32 = runExplainer(createK1ProofCloth(), 32);
  assert.ok(
    k32.iftVsSweep < k1.iftVsSweep,
    `K=1 ${k1.iftVsSweep} → K=32 ${k32.iftVsSweep}`,
  );
});

test("sweep vs finite difference on a 5×5 K=2 cloth", () => {
  const fdState = createCloth(5, 5);
  fdState.targetX = fdState.rest[2 * fdState.handle] + 1.2;
  fdState.targetY = fdState.rest[2 * fdState.handle + 1] - 1.4;
  const explained = runExplainer(fdState, 2);
  const fd = fdForceGrad(fdState, 2, fdState.probe, 0);
  const ad = explained.sweepAdj[2 * fdState.probe];
  const fdRel = Math.abs(fd - ad) / Math.max(Math.abs(fd), 1e-8);
  assert.ok(fdRel < 1e-6, `fd=${fd} ad=${ad} rel=${fdRel}`);
});
