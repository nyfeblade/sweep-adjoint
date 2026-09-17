export { SweepAdjointError, errorCopy, assertRunnable } from "./errors.js";
export type { SolverErrorCode } from "./errors.js";
export {
  createCloth,
  createEmptyMesh,
  cloneCloth,
  resetToRest,
  DEFAULT_GRID,
  DEFAULT_PARAMS,
  vertexIndex,
  vertexColor,
  colorOrder,
  setDraggedNode,
  requireMesh,
} from "./mesh.js";
export {
  forwardSweeps,
  unrolledAdjoint,
  sweepAdjoint,
  iftAdjoint,
  reverseColorSweep,
  runExplainer,
} from "./solver.js";
export {
  memoryReport,
  tryAllocateTape,
  tapeBytesFor,
  measureSolverWorkspaces,
  measuredTapeBytesFor,
  measuredSweepBytesFor,
  createUnrolledTape,
  createSweepWorkspace,
  UNROLLED_BYTES_PER_VERTEX_ITER,
  MEASURED_BYTES_PER_VERTEX,
} from "./memory.js";
export { formatBytes, formatPct, relError, maxAbsDiff, copyF64 } from "./math2.js";
export { probeLoss } from "./energy.js";
export {
  proveK1,
  createK1ProofCloth,
  fdForceGrad,
  K1_PROOF_GRID,
  K1_PROOF_SWEEPS,
} from "./prove-k1.js";
export type { K1Proof } from "./prove-k1.js";
export type {
  ClothState,
  ClothParams,
  Spring,
  LocalSystem,
  ExplainerResult,
  MemoryReport,
  TapeAllocation,
  MeasuredHold,
  MeasuredMemory,
  MethodName,
} from "./types.js";
