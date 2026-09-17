import { writeK1ProofArtifact } from "../src/cli.js";
import { formatK1GateReport, runK1Gate } from "../src/prove-k1.js";

const gate = runK1Gate();
console.log(formatK1GateReport(gate));
console.log("");
const artifactPath = writeK1ProofArtifact(gate.proof);
console.log(`proof artifact  ${artifactPath}`);
if (!gate.ok) {
  console.error("FAIL  K=1 gate did not hold.");
  process.exit(1);
}
console.log("PASS  sweep-adjoint matches tape/FD; IFT is wrong at K=1.");
