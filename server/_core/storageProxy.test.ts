import { describe, expect, it } from "vitest";
import { normalizeStorageProxyKey } from "./storageProxy";

describe("storage proxy path handling", () => {
  it("preserves nested object keys from the Express 5 wildcard parameter", () => {
    expect(normalizeStorageProxyKey(["companies", "7", "logo", "brand.svg"])).toBe("companies/7/logo/brand.svg");
    expect(normalizeStorageProxyKey("attempts/12/evidence/report.pdf")).toBe("attempts/12/evidence/report.pdf");
  });

  it("rejects an empty wildcard key before signing a storage URL", () => {
    expect(normalizeStorageProxyKey(undefined)).toBeNull();
    expect(normalizeStorageProxyKey("///")).toBeNull();
  });
});
