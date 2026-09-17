import { writeK1ProofArtifact } from "../src/cli.js";
import { measureLiveAdjointMemory } from "../src/measure.js";
import { createK1ProofCloth, formatK1GateReport, runK1Gate } from "../src/prove-k1.js";

function fail(message: string): never {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

const gate = runK1Gate();
console.log(formatK1GateReport(gate));
console.log("");
const artifactPath = writeK1ProofArtifact(gate.proof);
console.log(`proof artifact  ${artifactPath}`);
if (!gate.ok) {
  console.error("FAIL  K=1 gate did not hold.");
  process.exit(1);
}

const mem = measureLiveAdjointMemory(createK1ProofCloth(), 1);
if (!mem.ok || !mem.calledAdjoints) {
  fail(`live memory measure failed: ${mem.ok ? "calledAdjoints=false" : mem.reason}`);
}
console.log("");
console.log("Live Float64 peak (solver internals; not schematic 256 B/vertex):");
console.log(
  `  unrolled  ${mem.unrolledPeakBytes} B  (helper tape-only ${mem.schematicTapeBytes} B)`,
);
console.log(
  `  sweep     ${mem.sweepPeakBytes} B  (helper workspace-only ${mem.schematicSweepBytes} B)`,
);
console.log("");

console.log("PASS  sweep-adjoint matches tape/FD; IFT is wrong at K=1.");
