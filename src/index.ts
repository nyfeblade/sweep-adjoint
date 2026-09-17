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
  measuredTapeBytesFor,
  measuredSweepBytesFor,
  liveSweepPeakBytesFor,
  liveUnrolledPeakBytesFor,
  createUnrolledTape,
  createSweepWorkspace,
  allocF64,
  allocCopyF64,
  withFloat64Tracking,
  UNROLLED_BYTES_PER_VERTEX_ITER,
  MEASURED_BYTES_PER_VERTEX,
  ADJOINT_STATE_BUFFERS,
  UNROLLED_XFINAL_BUFFERS,
  FLOAT64_ALLOC_KINDS,
} from "./memory.js";
export { measureLiveAdjointMemory, measureSolverWorkspaces } from "./measure.js";
export { formatBytes, formatPct, relError, maxAbsDiff, copyF64 } from "./math2.js";
export { probeLoss } from "./energy.js";
export {
  proveK1,
  createK1ProofCloth,
  fdForceGrad,
  runK1Gate,
  serializeK1Proof,
  formatK1GateReport,
  K1_PROOF_GRID,
  K1_PROOF_SWEEPS,
  K1_PROOF_SCHEMA,
} from "./prove-k1.js";
export type { K1Proof, K1ProofArtifact, K1Gate, GateCheck } from "./prove-k1.js";
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
  Float64AllocKind,
  AllocationRecord,
  PathMemory,
} from "./types.js";
