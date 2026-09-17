#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { formatK1GateReport, runK1Gate, serializeK1Proof } from "./prove-k1.js";
import type { K1Proof } from "./prove-k1.js";

export const K1_PROOF_ARTIFACT_PATH = "artifacts/k1-proof.json";

export function writeK1ProofArtifact(proof: K1Proof): string {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(K1_PROOF_ARTIFACT_PATH, `${JSON.stringify(serializeK1Proof(proof), null, 2)}\n`);
  return K1_PROOF_ARTIFACT_PATH;
}

function main(): void {
  const gate = runK1Gate();
  console.log(formatK1GateReport(gate));
  console.log("");
  const artifactPath = writeK1ProofArtifact(gate.proof);
  console.log(`proof artifact  ${artifactPath}`);
  if (!gate.ok) {
    console.error("FAIL  K=1 gate did not hold.");
    process.exitCode = 1;
    return;
  }
  console.log("PASS  sweep-adjoint matches tape/FD; IFT is wrong at K=1.");
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main();
}
