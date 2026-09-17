import type {
  AllocationRecord,
  Float64AllocKind,
  MemoryReport,
  TapeAllocation,
} from "./types.js";

/** Schematic fat-tape model: x_old, H, g, y, plus temporaries per vertex per sweep. */
export const UNROLLED_BYTES_PER_VERTEX_ITER = 256;

/** Schematic reverse-sweep workspace (one colored iteration, not a K-deep tape). */
export const SWEEP_BYTES_PER_VERTEX = 256;

/** Schematic IFT residual / adjoint / CG scratch — O(N), not O(K·N). */
export const IFT_BYTES_PER_VERTEX = 96;

/** Unrolled tape / rematerialize workspace: 2 float64 coords per vertex. */
export const COORDS_PER_VERTEX = 2;

/**
 * Float64 coord stride: 2 × 8 B = 16 B per vertex per stored iteration.
 * This is the tape/workspace buffer size, not live peak solver memory.
 */
export const MEASURED_BYTES_PER_VERTEX = COORDS_PER_VERTEX * Float64Array.BYTES_PER_ELEMENT;

/** Both adjoints allocate `adj` and `forceAdj` besides tape/workspace. */
export const ADJOINT_STATE_BUFFERS = 2;

/** `unrolledAdjoint` also copies `x_final`. */
export const UNROLLED_XFINAL_BUFFERS = 1;

export const FLOAT64_ALLOC_KINDS = [
  "tape",
  "sweepWorkspace",
  "adj",
  "forceAdj",
  "xFinal",
] as const satisfies readonly Float64AllocKind[];

export function memoryReport(n: number, sweeps: number): MemoryReport {
  const k = Math.max(0, sweeps);
  const nodes = Math.max(0, n);
  return {
    n: nodes,
    sweeps: k,
    unrolledBytes: k * nodes * UNROLLED_BYTES_PER_VERTEX_ITER,
    sweepBytes: nodes * SWEEP_BYTES_PER_VERTEX,
    iftBytes: nodes * IFT_BYTES_PER_VERTEX,
  };
}

export function tryAllocateTape(bytes: number): TapeAllocation {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return { ok: false, bytes: 0, reason: "oom" };
  }
  const rounded = Math.ceil(bytes);
  try {
    const buffer = new ArrayBuffer(rounded);
    const view = new Uint8Array(buffer);
    if (rounded > 0) {
      view[0] = 1;
      view[rounded - 1] = 1;
    }
    return { ok: true, bytes: rounded, buffer };
  } catch {
    return { ok: false, bytes: rounded, reason: "oom" };
  }
}

export function tapeBytesFor(n: number, sweeps: number): number {
  return Math.max(0, n) * Math.max(0, sweeps) * UNROLLED_BYTES_PER_VERTEX_ITER;
}

/** Schematic tape buffer only: K × N × 16 B. Not live peak. */
export function measuredTapeBytesFor(n: number, sweeps: number): number {
  return Math.max(0, n) * Math.max(0, sweeps) * MEASURED_BYTES_PER_VERTEX;
}

/** Schematic rematerialize workspace only: N × 16 B. Not live peak. */
export function measuredSweepBytesFor(n: number): number {
  return Math.max(0, n) * MEASURED_BYTES_PER_VERTEX;
}

/** Live `sweepAdjoint` Float64 peak: workspace + adj + forceAdj. */
export function liveSweepPeakBytesFor(n: number): number {
  return measuredSweepBytesFor(n) * (1 + ADJOINT_STATE_BUFFERS);
}

/** Live `unrolledAdjoint` Float64 peak: tape + xFinal + adj + forceAdj. */
export function liveUnrolledPeakBytesFor(n: number, sweeps: number): number {
  return (
    measuredTapeBytesFor(n, sweeps) +
    measuredSweepBytesFor(n) * (UNROLLED_XFINAL_BUFFERS + ADJOINT_STATE_BUFFERS)
  );
}

export function emptyKindBytes(): Record<Float64AllocKind, number> {
  return { tape: 0, sweepWorkspace: 0, adj: 0, forceAdj: 0, xFinal: 0 };
}

export function addKindBytes(
  into: Record<Float64AllocKind, number>,
  kind: Float64AllocKind,
  bytes: number,
): void {
  switch (kind) {
    case "tape":
    case "sweepWorkspace":
    case "adj":
    case "forceAdj":
    case "xFinal":
      into[kind] += bytes;
      return;
    default: {
      const _never: never = kind;
      throw new Error(`unhandled alloc kind ${String(_never)}`);
    }
  }
}

type Tracker = {
  live: number;
  peak: number;
  records: AllocationRecord[];
  hold: Float64Array[];
};

export type TrackerSnapshot = {
  peakBytes: number;
  heldBytes: number;
  records: AllocationRecord[];
  hold: Float64Array[];
};

let active: Tracker | null = null;

/** Allocate a Float64 workspace and, if a tracker is active, count it toward peak/held. */
export function allocF64(length: number, kind: Float64AllocKind): Float64Array {
  const view = new Float64Array(Math.max(0, length));
  if (active) {
    const bytes = view.byteLength;
    active.records.push({ kind, bytes });
    active.live += bytes;
    active.peak = Math.max(active.peak, active.live);
    active.hold.push(view);
  }
  return view;
}

export function allocCopyF64(src: Float64Array, kind: Float64AllocKind): Float64Array {
  const view = allocF64(src.length, kind);
  view.set(src);
  return view;
}

/**
 * Run `fn` and record every `allocF64` / `allocCopyF64` it performs.
 * Peak equals held here: the adjoints do not free mid-call.
 */
export function withFloat64Tracking<T>(fn: () => T): TrackerSnapshot & { result: T } {
  if (active !== null) {
    throw new Error("nested Float64 tracking is not supported");
  }
  const tracker: Tracker = { live: 0, peak: 0, records: [], hold: [] };
  active = tracker;
  try {
    const result = fn();
    return {
      result,
      peakBytes: tracker.peak,
      heldBytes: tracker.live,
      records: tracker.records,
      hold: tracker.hold,
    };
  } finally {
    active = null;
  }
}

/** The K-deep position tape `unrolledAdjoint` allocates. */
export function createUnrolledTape(n: number, sweeps: number): Float64Array {
  return allocF64(Math.max(0, n) * Math.max(0, sweeps) * COORDS_PER_VERTEX, "tape");
}

/** The one-iteration rematerialize buffer `sweepAdjoint` allocates. */
export function createSweepWorkspace(n: number): Float64Array {
  return allocF64(Math.max(0, n) * COORDS_PER_VERTEX, "sweepWorkspace");
}

type PerformanceWithMemory = {
  memory?: { usedJSHeapSize?: number };
};

export function readHeapSize(): number | null {
  const perf = globalThis.performance as PerformanceWithMemory | undefined;
  const used = perf?.memory?.usedJSHeapSize;
  return typeof used === "number" && Number.isFinite(used) ? used : null;
}
