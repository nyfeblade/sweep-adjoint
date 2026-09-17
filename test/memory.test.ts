import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cloneCloth,
  copyF64,
  createCloth,
  createEmptyMesh,
  createK1ProofCloth,
  liveSweepPeakBytesFor,
  liveUnrolledPeakBytesFor,
  measuredSweepBytesFor,
  measuredTapeBytesFor,
  measureLiveAdjointMemory,
  measureSolverWorkspaces,
  resetToRest,
  sweepAdjoint,
  unrolledAdjoint,
} from "../src/index.ts";

function requireOk(mem: ReturnType<typeof measureSolverWorkspaces>) {
  assert.equal(mem.ok, true, mem.ok ? "" : mem.reason);
  if (!mem.ok) throw new Error("unreachable");
  return mem;
}

test("live measure calls both adjoints; helper-only sizes are a strict underclaim", () => {
  const cloth = createK1ProofCloth();
  const n = cloth.n;
  const k = 2;

  const directUnrolled = cloneCloth(cloth);
  resetToRest(directUnrolled);
  const expectedUnrolled = unrolledAdjoint(directUnrolled, k);

  const directSweep = cloneCloth(cloth);
  resetToRest(directSweep);
  const x0 = copyF64(directSweep.x);
  directSweep.x.set(directUnrolled.x);
  const expectedSweep = sweepAdjoint(directSweep, k, x0);

  const mem = requireOk(measureLiveAdjointMemory(cloth, k));

  assert.equal(mem.calledAdjoints, true);
  assert.deepEqual([...mem.hold.unrolledForceAdj], [...expectedUnrolled]);
  assert.deepEqual([...mem.hold.sweepForceAdj], [...expectedSweep]);
  assert.deepEqual([...mem.unrolled.forceAdj], [...mem.sweep.forceAdj]);

  assert.equal(mem.schematicTapeBytes, measuredTapeBytesFor(n, k));
  assert.equal(mem.schematicSweepBytes, measuredSweepBytesFor(n));
  assert.ok(
    mem.unrolledPeakBytes > mem.schematicTapeBytes,
    `helper-only tape ${mem.schematicTapeBytes} must underclaim live unrolled peak ${mem.unrolledPeakBytes}`,
  );
  assert.ok(
    mem.sweepPeakBytes > mem.schematicSweepBytes,
    `helper-only workspace ${mem.schematicSweepBytes} must underclaim live sweep peak ${mem.sweepPeakBytes}`,
  );
  assert.equal(mem.unrolledPeakBytes, liveUnrolledPeakBytesFor(n, k));
  assert.equal(mem.sweepPeakBytes, liveSweepPeakBytesFor(n));
  assert.equal(mem.tapeBytes, measuredTapeBytesFor(n, k));
  assert.equal(mem.sweepWorkspaceBytes, measuredSweepBytesFor(n));
  assert.ok(mem.hold.unrolledForceAdj.some((v) => v !== 0));
  assert.ok(mem.hold.sweepForceAdj.some((v) => v !== 0));
});

test("live tape grows with K; sweep peak is O(N) not O(KN)", () => {
  const n = 100;
  const k1 = requireOk(measureSolverWorkspaces(n, 1));
  const k8 = requireOk(measureSolverWorkspaces(n, 8));
  const k32 = requireOk(measureSolverWorkspaces(n, 32));

  assert.equal(k1.calledAdjoints && k8.calledAdjoints && k32.calledAdjoints, true);

  assert.equal(k1.sweepPeakBytes, k8.sweepPeakBytes);
  assert.equal(k8.sweepPeakBytes, k32.sweepPeakBytes);
  assert.equal(k1.sweepPeakBytes, liveSweepPeakBytesFor(n));
  assert.equal(k1.sweepPeakBytes / n, k32.sweepPeakBytes / n);

  assert.equal(k1.tapeBytes, measuredTapeBytesFor(n, 1));
  assert.equal(k32.tapeBytes, k1.tapeBytes * 32);
  assert.equal(k32.unrolledPeakBytes, liveUnrolledPeakBytesFor(n, 32));
  assert.equal(k32.unrolledPeakBytes - k1.unrolledPeakBytes, measuredTapeBytesFor(n, 31));
  assert.ok(k32.unrolledPeakBytes > k32.sweepPeakBytes);
  assert.ok(k32.unrolledPeakBytes / n > k1.unrolledPeakBytes / n);

  assert.equal(k1.unrolled.bytesByKind.xFinal, measuredSweepBytesFor(n), `kinds=${JSON.stringify(k1.unrolled.bytesByKind)}`);
  assert.equal(k1.unrolled.bytesByKind.adj, measuredSweepBytesFor(n));
  assert.equal(k1.unrolled.bytesByKind.forceAdj, measuredSweepBytesFor(n));
  assert.equal(k1.sweep.bytesByKind.adj, measuredSweepBytesFor(n));
  assert.equal(k1.sweep.bytesByKind.forceAdj, measuredSweepBytesFor(n));
  assert.equal(k1.sweep.bytesByKind.tape, 0);
  assert.equal(k1.unrolled.bytesByKind.sweepWorkspace, 0);
});

test("empty mesh and K=0 do not claim a live hold", () => {
  const empty = measureLiveAdjointMemory(createEmptyMesh(), 1);
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.calledAdjoints, false);
    assert.equal(empty.reason, "empty_mesh");
  }

  const k0 = measureLiveAdjointMemory(createCloth(4, 4), 0);
  assert.equal(k0.ok, false);
  if (!k0.ok) {
    assert.equal(k0.calledAdjoints, false);
    assert.equal(k0.reason, "k_zero");
  }
});
