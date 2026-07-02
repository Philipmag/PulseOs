import { EncryptionService } from "./encryption.service.js";

function makeService(key?: string): EncryptionService {
  const config = {
    get: (_name: string) => key,
  } as unknown as ConstructorParameters<typeof EncryptionService>[0];
  return new EncryptionService(config);
}

describe("EncryptionService", () => {
  const key = Buffer.alloc(32, 7).toString("base64"); // deterministic 256-bit key

  it("round-trips plaintext (encrypt → decrypt)", () => {
    const svc = makeService(key);
    const secret = "oauth-access-token-abc123";
    const enc = svc.encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(svc.decrypt(enc)).toBe(secret);
  });

  it("produces a fresh IV each call (ciphertext differs)", () => {
    const svc = makeService(key);
    expect(svc.encrypt("same")).not.toBe(svc.encrypt("same"));
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const svc = makeService(key);
    const enc = svc.encrypt("token");
    const [iv, tag, data] = enc.split(".");
    const flipped = data.slice(0, -2) + (data.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => svc.decrypt(`${iv}.${tag}.${flipped}`)).toThrow();
  });

  it("throws on a wrong-length key", () => {
    expect(() => makeService(Buffer.alloc(16).toString("base64"))).toThrow(
      /32-byte/,
    );
  });
});
