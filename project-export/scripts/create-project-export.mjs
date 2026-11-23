import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile, cp, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const project = join(root, "..");
const output = join(project, "project-export");
const zipPath = join(project, "project-export.zip");

const excluded = [
  ".git", ".project-config.json", ".env", ".env.local", ".env.development.local", ".env.test.local", ".env.production.local",
  "node_modules", "dist", "build", "coverage", "test-results", ".manus-logs", "client/public/__manus__", "project-export", "project-export.zip",
];
const secretPattern = /(BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BUILT_IN_FORGE_API_KEY\\s*[:=]\\s*[^<\n]+|JWT_SECRET\\s*[:=]\\s*[^<\n]+|DATABASE_URL\\s*[:=]\\s*[^<\n]+@)/i;

function isExcluded(path) {
  const rel = relative(project, path).replaceAll("\\", "/");
  return excluded.some(entry => rel === entry || rel.startsWith(`${entry}/`));
}

async function copyTree(source, target) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = join(source, entry.name);
    if (isExcluded(from)) continue;
    const to = join(target, entry.name);
    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true });
      await copyTree(from, to);
    } else if (entry.isFile()) {
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to);
    }
  }
}

await rm(output, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(output, { recursive: true });
await copyTree(project, output);

const files = [];
async function collectFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full);
    else if (entry.isFile()) {
      const rel = relative(project, full).replaceAll("\\", "/");
      files.push(rel);
    }
  }
}
await collectFiles(output);

const suspicious = [];
const realDataMarkers = [];
for (const rel of files) {
  const full = join(project, rel);
  if (!/\.(json|ts|tsx|js|mjs|md|sql|html|css|txt|yml|yaml|toml)$/.test(rel)) continue;
  const text = await readFile(full, "utf8");
  if (secretPattern.test(text)) suspicious.push(rel);
  if (/\.(sql|dump|csv)$/.test(rel) && /(^|\n)\s*(INSERT\s+INTO|CREATE\s+DATABASE)|mysqldump|pg_dump/i.test(text)) realDataMarkers.push(rel);
}
if (suspicious.length || realDataMarkers.length) {
  if (suspicious.length) console.error(`Secret-like content found in export: ${suspicious.join(", ")}`);
  if (realDataMarkers.length) console.error(`Database-dump-like content found in export: ${realDataMarkers.join(", ")}`);
  process.exitCode = 1;
} else {
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8" }).trim(),
    root: "project-export",
    includedFiles: files,
    excluded,
    notes: [
      "No credentials, environment files, Manus project metadata, build output, logs, node_modules, or database dumps are included.",
      "Development fixture generators are source code only; no seeded database or customer data is included.",
      "supabase/migrations/00000000000000_skillforge_baseline.sql is a reviewed migration starting point, not an automatic production conversion.",
    ],
  };
  await writeFile(join(output, "EXPORT_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  files.push("project-export/EXPORT_MANIFEST.json");
  execFileSync("zip", ["-qr", zipPath, "project-export"], { cwd: project, stdio: "inherit" });
  console.log(`Created ${zipPath}`);
  console.log(`Included ${files.length} files under project-export/`);
}
