import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectFileSizeViolations, isExcludedPath } from "./check-file-size.mjs";

describe("isExcludedPath", () => {
  it("excludes web and ML test paths", () => {
    assert.equal(isExcludedPath("apps/web/src/__tests__/foo.test.ts"), true);
    assert.equal(isExcludedPath("apps/web/src/lib/foo.test.ts"), true);
    assert.equal(isExcludedPath("services/ml/tests/test_infer.py"), true);
  });

  it("keeps production paths", () => {
    assert.equal(isExcludedPath("apps/web/src/lib/mapa.ts"), false);
    assert.equal(isExcludedPath("services/ml/src/verdia_ml/app.py"), false);
  });
});

describe("collectFileSizeViolations", () => {
  it("reports files over the max line count", () => {
    const violations = collectFileSizeViolations(
      [
        { path: "apps/web/src/lib/ok.ts", lineCount: 10 },
        { path: "apps/web/src/lib/big.ts", lineCount: 401 },
      ],
      { maxFileLines: 400 },
    );
    assert.deepEqual(violations, [
      {
        path: "apps/web/src/lib/big.ts",
        lineCount: 401,
        maxFileLines: 400,
      },
    ]);
  });

  it("skips excluded test paths even when oversized", () => {
    const violations = collectFileSizeViolations(
      [{ path: "apps/web/src/__tests__/huge.test.ts", lineCount: 900 }],
      { maxFileLines: 400 },
    );
    assert.deepEqual(violations, []);
  });

  it("uses the provided max for ML packages", () => {
    const violations = collectFileSizeViolations(
      [{ path: "services/ml/src/verdia_ml/big.py", lineCount: 501 }],
      { maxFileLines: 500 },
    );
    assert.equal(violations.length, 1);
  });
});
