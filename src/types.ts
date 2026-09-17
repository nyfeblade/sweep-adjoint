export type ClothParams = {
  spacing: number;
  springK: number;
  shearK: number;
  pinK: number;
  handleK: number;
  gravityY: number;
  regularizer: number;
};

export type Spring = {
  i: number;
  j: number;
  rest: number;
  k: number;
};

export type ClothState = {
  nx: number;
  ny: number;
  n: number;
  x: Float64Array;
  rest: Float64Array;
  force: Float64Array;
  pinned: Uint8Array;
  handle: number;
  probe: number;
  targetX: number;
  targetY: number;
  springs: Spring[];
  params: ClothParams;
};

export type LocalSystem = {
  g0: number;
  g1: number;
  h00: number;
  h01: number;
  h10: number;
  h11: number;
};

export type MethodName = "unrolled" | "ift" | "sweep";

export type ExplainerResult = {
  x: Float64Array;
  loss: number;
  sweepAdj: Float64Array;
  unrolledAdj: Float64Array;
  iftAdj: Float64Array;
  sweepVsUnrolled: number;
  iftVsUnrolled: number;
  iftVsSweep: number;
  sweeps: number;
  cgIters: number;
  /** Schematic 256 B/vertex model — not live peak. See `measureLiveAdjointMemory`. */
  memory: MemoryReport;
};

export type MemoryReport = {
  n: number;
  sweeps: number;
  unrolledBytes: number;
  sweepBytes: number;
  iftBytes: number;
};

export type TapeAllocation =
  | { ok: true; bytes: number; buffer: ArrayBuffer }
  | { ok: false; bytes: number; reason: "oom" | "limit" };

/** Float64 workspaces allocated inside `unrolledAdjoint` / `sweepAdjoint`. */
export type Float64AllocKind = "tape" | "sweepWorkspace" | "adj" | "forceAdj" | "xFinal";

export type AllocationRecord = {
  kind: Float64AllocKind;
  bytes: number;
};

export type PathMemory = {
  peakBytes: number;
  heldBytes: number;
  bytesByKind: Record<Float64AllocKind, number>;
  records: AllocationRecord[];
  forceAdj: Float64Array;
};

/** TypedArrays the live adjoints allocated. Held so GC cannot drop them. */
export type MeasuredHold = {
  unrolledTape: Float64Array;
  unrolledXFinal: Float64Array;
  unrolledAdj: Float64Array;
  unrolledForceAdj: Float64Array;
  sweepWorkspace: Float64Array;
  sweepAdj: Float64Array;
  sweepForceAdj: Float64Array;
};

export type MeasuredMemory =
  | {
      ok: true;
      n: number;
      sweeps: number;
      /** Both adjoints ran. A helper-only path cannot set this honestly. */
      calledAdjoints: true;
      /** Old helper-only claim: K-deep tape `.byteLength`, no adj/forceAdj/xFinal. */
      schematicTapeBytes: number;
      /** Old helper-only claim: rematerialize workspace `.byteLength`, no adj/forceAdj. */
      schematicSweepBytes: number;
      /** Peak Float64 bytes inside `unrolledAdjoint`: tape + xFinal + adj + forceAdj. */
      unrolledPeakBytes: number;
      /** Peak Float64 bytes inside `sweepAdjoint`: workspace + adj + forceAdj. Independent of K. */
      sweepPeakBytes: number;
      /** K-deep position tape only. */
      tapeBytes: number;
      /** One-iteration rematerialize workspace only. */
      sweepWorkspaceBytes: number;
      /** Chromium `performance.memory.usedJSHeapSize` delta; null on Node. Not the claim. */
      heapDeltaBytes: number | null;
      unrolled: PathMemory;
      sweep: PathMemory;
      hold: MeasuredHold;
    }
  | {
      ok: false;
      n: number;
      sweeps: number;
      calledAdjoints: false;
      schematicTapeBytes: number;
      schematicSweepBytes: number;
      unrolledPeakBytes: number;
      sweepPeakBytes: number;
      tapeBytes: number;
      sweepWorkspaceBytes: number;
      heapDeltaBytes: null;
      reason: "oom" | "empty_mesh" | "k_zero";
    };
