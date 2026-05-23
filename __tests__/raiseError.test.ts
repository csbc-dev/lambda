import { describe, expect, it } from "vitest";

import { toLambdaError } from "../src/raiseError.js";

describe("toLambdaError", () => {
  it("preserves existing package LambdaError objects", () => {
    const error = { code: "LAMBDA_INPUT_ERROR", message: "bad input" } as const;

    expect(toLambdaError(error, "LAMBDA_PROVIDER_ERROR")).toBe(error);
  });

  it("normalizes foreign code-bearing errors to the requested Lambda error code", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });

    expect(toLambdaError(error, "LAMBDA_PROVIDER_ERROR")).toMatchObject({
      code: "LAMBDA_PROVIDER_ERROR",
      message: "connect ECONNREFUSED",
    });
  });
});