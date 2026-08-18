import { describe, expect, it } from "vitest";
import { MOCK_ROLES, parseMockRoleHeader } from "./mockAuth";

describe("development mock authentication", () => {
  it("supports only the three platform roles", () => {
    expect(MOCK_ROLES).toEqual(["candidate", "company", "supervisor"]);
    expect(parseMockRoleHeader("candidate")).toBe("candidate");
    expect(parseMockRoleHeader("company")).toBe("company");
    expect(parseMockRoleHeader("supervisor")).toBe("supervisor");
  });

  it("rejects arbitrary role values and repeated header arrays safely", () => {
    expect(parseMockRoleHeader("admin")).toBeNull();
    expect(parseMockRoleHeader(undefined)).toBeNull();
    expect(parseMockRoleHeader(["supervisor", "candidate"])).toBe("supervisor");
    expect(parseMockRoleHeader([])).toBeNull();
  });

  it("keeps the production guard in the implementation", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./mockAuth.ts", import.meta.url), "utf8"));
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("return null");
  });
});
