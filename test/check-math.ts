import { SweepAdjointError } from "../src/errors.js";
import { createCloth, createEmptyMesh } from "../src/mesh.js";
import { proveK1 } from "../src/prove-k1.js";
import { runExplainer } from "../src/solver.js";

function fail(message: string): never {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

try {
  runExplainer(createEmptyMesh(), 1);
  fail("empty mesh should throw SweepAdjointError");
} catch (error) {
  if (!(error instanceof SweepAdjointError) || error.code !== "empty_mesh") {
    fail(`empty mesh: expected empty_mesh, got ${String(error)}`);
  }
  console.log("ok    empty mesh → SweepAdjointError(empty_mesh)");
}

try {
  runExplainer(createCloth(4, 4), 0);
  fail("K=0 should throw SweepAdjointError");
} catch (error) {
  if (!(error instanceof SweepAdjointError) || error.code !== "k_zero") {
    fail(`K=0: expected k_zero, got ${String(error)}`);
  }
  console.log("ok    K=0 → SweepAdjointError(k_zero)");
}

const proof = proveK1();

console.log("");
console.log("K=1 verification  ·  10×10 VBD mass-spring  ·  ONE sweep");
console.log("p = handle force_x    L = ½‖x_probe − rest‖²");
console.log("");
console.log(`${"method".padEnd(24)} ${"∂L/∂p".padStart(14)} ${"vs FD".padStart(10)}`);
console.log("-".repeat(52));
console.log(
  `${"Central FD (gold)".padEnd(24)} ${proof.fd.toExponential(8).padStart(14)} ${"0.00e+0".padStart(10)}`,
);
console.log(
  `${"Tape / unrolled AD".padEnd(24)} ${proof.unrolled.toExponential(8).padStart(14)} ${(Math.abs(proof.unrolled - proof.fd) / Math.max(Math.abs(proof.fd), 1e-12)).toExponential(2).padStart(10)}`,
);
console.log(
  `${"Standard IFT".padEnd(24)} ${proof.ift.toExponential(8).padStart(14)} ${proof.iftVsFd.toExponential(2).padStart(10)}`,
);
console.log(
  `${"Sweep-adjoint".padEnd(24)} ${proof.sweep.toExponential(8).padStart(14)} ${proof.sweepVsFd.toExponential(2).padStart(10)}`,
);
console.log("");
console.log(`sweep vs tape  ${proof.sweepVsUnrolled.toExponential(2)}`);
console.log(`IFT vs sweep   ${proof.iftVsSweep.toFixed(3)}`);
console.log("");

if (!proof.ok) {
  fail(
    `thesis did not hold: sweepVsFd=${proof.sweepVsFd.toExponential(2)} sweepVsUnrolled=${proof.sweepVsUnrolled.toExponential(2)} iftVsFd=${proof.iftVsFd.toFixed(3)}`,
  );
}

console.log("PASS  sweep-adjoint matches tape/FD; IFT is wrong at K=1.");
