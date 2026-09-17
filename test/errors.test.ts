import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SweepAdjointError,
  assertRunnable,
  createCloth,
  createEmptyMesh,
  errorCopy,
  runExplainer,
  sweepAdjoint,
  unrolledAdjoint,
} from "../src/index.ts";

test("empty mesh is a first-class SweepAdjointError", () => {
  assert.throws(
    () => runExplainer(createEmptyMesh(), 1),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "empty_mesh",
  );
  assert.throws(
    () => unrolledAdjoint(createEmptyMesh(), 1),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "empty_mesh",
  );
  const empty = createEmptyMesh();
  assert.throws(
    () => sweepAdjoint(empty, 1, empty.x),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "empty_mesh",
  );
  assert.throws(() => assertRunnable(0, 1), SweepAdjointError);
  assert.equal(errorCopy("empty_mesh").title, "Empty mesh");
});

test("K=0 is a first-class SweepAdjointError", () => {
  const cloth = createCloth(4, 4);
  assert.throws(
    () => runExplainer(cloth, 0),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "k_zero",
  );
  assert.throws(
    () => unrolledAdjoint(createCloth(4, 4), 0),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "k_zero",
  );
  assert.throws(
    () => sweepAdjoint(cloth, 0, cloth.x),
    (error: unknown) => error instanceof SweepAdjointError && error.code === "k_zero",
  );
  assert.throws(() => assertRunnable(4, 0), SweepAdjointError);
  assert.equal(errorCopy("k_zero").title, "K = 0");
});
