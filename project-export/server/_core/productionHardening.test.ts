import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexSource = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
const viteSource = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");
const platformSource = readFileSync(resolve(process.cwd(), "client/src/pages/Platform.tsx"), "utf8");
const recoverySource = readFileSync(resolve(process.cwd(), "client/src/pages/NotFound.tsx"), "utf8");

describe("production hardening", () => {
  it("keeps health checks, response hardening, and bounded body parsing enabled", () => {
    expect(indexSource).toContain('app.disable("x-powered-by")');
    expect(indexSource).toContain('app.get("/healthz"');
    expect(indexSource).toContain('express.json({ limit: "12mb" })');
    expect(indexSource).toContain('"X-Content-Type-Options", "nosniff"');
    expect(indexSource).toContain('"X-Frame-Options", "DENY"');
    expect(indexSource).toContain('"Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()"');
  });

  it("keeps the storage proxy and SPA fallback compatible with Express 5", () => {
    expect(indexSource).toContain("registerStorageProxy(app)");
    expect(viteSource).toContain('express.static(distPath, { index: false, maxAge: "1y", immutable: true })');
    expect(viteSource).toContain('if (req.method !== "GET" && req.method !== "HEAD")');
  });

  it("preserves accessible recovery semantics and responsive company metrics", () => {
    expect(recoverySource).toContain("<main");
    expect(recoverySource).toContain("<h1");
    expect(recoverySource).toContain('overflow-x-hidden');
    expect(platformSource).toContain('sm:grid-cols-2 xl:grid-cols-4');
  });
});
