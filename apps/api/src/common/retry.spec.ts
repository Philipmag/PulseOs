import { retry } from "./retry.js";

describe("retry", () => {
  it("returns immediately on first success", async () => {
    let calls = 0;
    const r = await retry(
      async () => {
        calls++;
        return "ok";
      },
      { retries: 3, delayMs: 1 },
    );
    expect(r).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries then succeeds", async () => {
    let calls = 0;
    const r = await retry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { retries: 5, delayMs: 1, backoff: 1 },
    );
    expect(r).toBe("ok");
    expect(calls).toBe(3);
  });

  it("stops immediately when shouldRetry returns false", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls++;
          throw new Error("401");
        },
        { retries: 5, delayMs: 1, shouldRetry: () => false },
      ),
    ).rejects.toThrow("401");
    expect(calls).toBe(1);
  });

  it("throws the last error after exhausting retries", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls++;
          throw new Error(`fail-${calls}`);
        },
        { retries: 2, delayMs: 1, backoff: 1 },
      ),
    ).rejects.toThrow("fail-3");
    expect(calls).toBe(3);
  });
});
