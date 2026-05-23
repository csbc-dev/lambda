import { describe, expect, it, vi } from "vitest";

import { LambdaRemoteProvider } from "../src/remote/LambdaRemoteProvider.js";

describe("LambdaRemoteProvider", () => {
  it("reports non-JSON HTTP failures without parsing the body", async () => {
    const provider = new LambdaRemoteProvider({
      url: "https://example.test/lambda",
      fetch: vi.fn(async () => new Response("<html>bad gateway</html>", {
        status: 502,
        statusText: "Bad Gateway",
      })) as unknown as typeof fetch,
    });

    await expect(provider.invoke({
      functionName: "safe-function",
      payload: null,
      mode: "buffered",
    })).rejects.toMatchObject({
      code: "LAMBDA_PROVIDER_ERROR",
      message: "Remote Lambda invoke failed with HTTP 502 Bad Gateway",
    });
  });
});