import { SweepAdjointError } from "./errors.js";
import { copyF64 } from "./math2.js";
import {
  addKindBytes,
  emptyKindBytes,
  measuredSweepBytesFor,
  measuredTapeBytesFor,
  readHeapSize,
  withFloat64Tracking,
  type TrackerSnapshot,
} from "./memory.js";
import { cloneCloth, createCloth, createEmptyMesh, resetToRest } from "./mesh.js";
import { sweepAdjoint, unrolledAdjoint } from "./solver.js";
import type {
  AllocationRecord,
  ClothState,
  Float64AllocKind,
  MeasuredHold,
  MeasuredMemory,
  PathMemory,
} from "./types.js";

function clothWithN(n: number): ClothState {
  if (n <= 0) return createEmptyMesh();
  const side = Math.floor(Math.sqrt(n));
  if (side >= 2 && side * side === n) return createCloth(side, side);
  return createCloth(n, 1);
}

function bytesByKind(records: AllocationRecord[]): Record<Float64AllocKind, number> {
  const into = emptyKindBytes();
  for (const rec of records) addKindBytes(into, rec.kind, rec.bytes);
  return into;
}

function arrayOfKind(tracked: TrackerSnapshot, kind: Float64AllocKind): Float64Array {
  for (let i = tracked.records.length - 1; i >= 0; i--) {
    if (tracked.records[i].kind === kind) return tracked.hold[i];
  }
  return new Float64Array(0);
}

function summarizePath(tracked: TrackerSnapshot & { result: Float64Array }): PathMemory {
  return {
    peakBytes: tracked.peakBytes,
    heldBytes: tracked.heldBytes,
    bytesByKind: bytesByKind(tracked.records),
    records: tracked.records,
    forceAdj: tracked.result,
  };
}

function holdFrom(unrolled: TrackerSnapshot, sweep: TrackerSnapshot): MeasuredHold {
  return {
    unrolledTape: arrayOfKind(unrolled, "tape"),
    unrolledXFinal: arrayOfKind(unrolled, "xFinal"),
    unrolledAdj: arrayOfKind(unrolled, "adj"),
    unrolledForceAdj: arrayOfKind(unrolled, "forceAdj"),
    sweepWorkspace: arrayOfKind(sweep, "sweepWorkspace"),
    sweepAdj: arrayOfKind(sweep, "adj"),
    sweepForceAdj: arrayOfKind(sweep, "forceAdj"),
  };
}

function failMemory(
  n: number,
  sweeps: number,
  reason: "oom" | "empty_mesh" | "k_zero",
): MeasuredMemory {
  const schematicTapeBytes = measuredTapeBytesFor(n, Math.max(0, sweeps));
  const schematicSweepBytes = measuredSweepBytesFor(n);
  return {
    ok: false,
    n,
    sweeps,
    calledAdjoints: false,
    schematicTapeBytes,
    schematicSweepBytes,
    unrolledPeakBytes: 0,
    sweepPeakBytes: 0,
    tapeBytes: schematicTapeBytes,
    sweepWorkspaceBytes: schematicSweepBytes,
    heapDeltaBytes: null,
    reason,
  };
}

/**
 * Run `unrolledAdjoint` and `sweepAdjoint` and return the Float64 workspaces
 * those calls actually allocated. This is not a schematic helper size.
 *
 * Counted: tape, rematerialize workspace, adj, forceAdj, and (unrolled) xFinal.
 * Not counted: `colorOrder` index arrays, cloth clones, or Chromium heap.
 */
export function measureLiveAdjointMemory(state: ClothState, sweeps: number): MeasuredMemory {
  const nodes = state.n;
  try {
    const unrolledState = cloneCloth(state);
    const sweepState = cloneCloth(state);
    resetToRest(unrolledState);
    resetToRest(sweepState);
    const x0 = copyF64(sweepState.x);

    const before = readHeapSize();
    // Seed sweep at x_final, same calling convention as `runExplainer`.
    const unrolledTracked = withFloat64Tracking(() => unrolledAdjoint(unrolledState, sweeps));
    sweepState.x.set(unrolledState.x);
    const sweepTracked = withFloat64Tracking(() => sweepAdjoint(sweepState, sweeps, x0));
    const after = readHeapSize();

    const unrolled = summarizePath(unrolledTracked);
    const sweep = summarizePath(sweepTracked);

    return {
      ok: true,
      n: nodes,
      sweeps,
      calledAdjoints: true,
      schematicTapeBytes: measuredTapeBytesFor(nodes, sweeps),
      schematicSweepBytes: measuredSweepBytesFor(nodes),
      unrolledPeakBytes: unrolled.peakBytes,
      sweepPeakBytes: sweep.peakBytes,
      tapeBytes: unrolled.bytesByKind.tape,
      sweepWorkspaceBytes: sweep.bytesByKind.sweepWorkspace,
      heapDeltaBytes: before !== null && after !== null ? Math.max(0, after - before) : null,
      unrolled,
      sweep,
      hold: holdFrom(unrolledTracked, sweepTracked),
    };
  } catch (error) {
    if (error instanceof SweepAdjointError && (error.code === "empty_mesh" || error.code === "k_zero")) {
      return failMemory(nodes, sweeps, error.code);
    }
    return failMemory(nodes, sweeps, "oom");
  }
}

/**
 * Build an n-vertex cloth and measure live adjoint Float64 peak/held.
 * Replaces the old helper-only path that never called the solvers.
 */
export function measureSolverWorkspaces(n: number, sweeps: number): MeasuredMemory {
  return measureLiveAdjointMemory(clothWithN(n), sweeps);
}
