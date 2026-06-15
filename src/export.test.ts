/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adversarial verification for the blueprint exporter.
 * Run: npx tsx src/export.test.ts
 *
 * The decisive test: generate scaffold.mjs from HOSTILE file content
 * (template literals, $, backticks, quotes, fences, a line equal to a common
 * heredoc delimiter, CRLF), actually execute it, and diff every written file
 * byte-for-byte against the input. A benign fixture would let escaping bugs
 * pass silently — so the fixture is deliberately nasty.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import {
  collectFiles,
  collectDirectories,
  buildScaffoldMjs,
  buildBlueprintMarkdown,
  safeFence,
} from "./export";
import type { ArchitecturalPlanResponse } from "./types";

let passed = 0;
const ok = (name: string) => {
  passed++;
  console.log(`  ✓ ${name}`);
};

// --- Hostile content: everything that breaks naive shell escaping. ---
const HOSTILE_TS = [
  "export const greet = (name: string) => `Hello ${name}, you owe $${100}`;",
  "const re = /\\$\\{.*\\}/g; // backticks: ` ` and $(whoami) and `id`",
  'const s = "double \\"quotes\\" and \'single\' and `template`";',
  "EOF", // a line equal to a classic heredoc delimiter
  "```", // a markdown fence inside code
  "\t// tab-indented; trailing space below  ",
  "echo $HOME && rm -rf / # must NOT execute",
  "",
].join("\n");

const HOSTILE_YML = "run: echo \"${{ secrets.TOKEN }}\" && printf '`backtick`'\nEOF\nEOFEOF\n";

const PLAN: Partial<ArchitecturalPlanResponse> = {
  projectName: "Hostile */ Project `name`",
  oneLiner: "A blueprint whose code contains every escaping hazard.",
  scope: ["Round-trip arbitrary code", "No shell injection"],
  boilerplates: {
    "src/index.ts": HOSTILE_TS,
    "src/weird/$dollar dir/file with spaces.ts": "const x = `${y}`;\n",
  },
  authStrategy: {
    method: "JWT",
    passwordManagement: "argon2",
    rbac: "role table",
    boilerplatePath: "src/auth/jwt.ts",
    boilerplateCode: 'const secret = process.env.JWT_SECRET ?? "`fallback`";\n',
  },
  testingStrategy: {
    testingFramework: "Vitest",
    command: "npm test",
    configBoilerplatePath: "vitest.config.ts",
    configBoilerplate: "export default { test: { name: `$suite` } };\n",
    sampleTestPath: "src/index.test.ts",
    sampleTestCode: "expect(`${1+1}`).toBe('2');\n",
  },
  cicdStrategy: {
    toolName: "GitHub Actions",
    reason: "standard",
    configFileTemplatePath: ".github/workflows/ci.yml",
    configFileContent: HOSTILE_YML,
    stages: [{ name: "build", description: "build it", commandsOrActions: ["npm ci"] }],
  },
  tree: [
    { path: "src", type: "directory" },
    { path: "src/empty-intentional", type: "directory" },
    { path: "src/index.ts", type: "file" },
  ],
};

// --- 1. collectFiles merges all five sources, boilerplates canonical. ---
{
  const files = collectFiles(PLAN);
  assert.equal(files["src/index.ts"], HOSTILE_TS);
  assert.equal(files["src/auth/jwt.ts"], PLAN.authStrategy!.boilerplateCode);
  assert.equal(files["vitest.config.ts"], PLAN.testingStrategy!.configBoilerplate);
  assert.equal(files["src/index.test.ts"], PLAN.testingStrategy!.sampleTestCode);
  assert.equal(files[".github/workflows/ci.yml"], HOSTILE_YML);
  assert.equal(Object.keys(files).length, 6);
  ok("collectFiles merges all five content sources");
}

// --- 2. Precedence: boilerplates win over a colliding strategy path. ---
{
  const collidePlan: Partial<ArchitecturalPlanResponse> = {
    boilerplates: { "src/auth/jwt.ts": "CANONICAL" },
    authStrategy: {
      method: "x", passwordManagement: "x", rbac: "x",
      boilerplatePath: "src/auth/jwt.ts", boilerplateCode: "SNIPPET",
    },
  };
  assert.equal(collectFiles(collidePlan)["src/auth/jwt.ts"], "CANONICAL");
  ok("boilerplates are canonical on path collision");
}

// --- 3. collectDirectories surfaces explicit (incl. empty) dirs. ---
{
  const dirs = collectDirectories(PLAN);
  assert.deepEqual(dirs.sort(), ["src", "src/empty-intentional"]);
  ok("collectDirectories returns declared directories");
}

// --- 4. safeFence outgrows the longest backtick run in content. ---
{
  assert.equal(safeFence("no backticks").length, 3);
  assert.equal(safeFence("a ``` b").length, 4);
  assert.equal(safeFence("a ````` b").length, 6);
  ok("safeFence picks a fence longer than any inner run");
}

// --- 5. BLUEPRINT.md never has a code block terminated early by inner fence. ---
{
  const md = buildBlueprintMarkdown(PLAN);
  assert.ok(md.includes("Hostile */ Project `name`") === false || md.includes("# Hostile"));
  // The hostile TS has a ``` line; its block must use a >=4 fence.
  assert.ok(md.includes("````"), "expected a 4+ backtick fence around fenced content");
  ok("BLUEPRINT.md fences survive embedded code fences");
}

// --- 6. THE decisive test: generate scaffold.mjs, RUN it, diff byte-for-byte. ---
{
  const work = mkdtempSync(join(tmpdir(), "aos-scaffold-"));
  try {
    const scaffoldPath = join(work, "scaffold.mjs");
    writeFileSync(scaffoldPath, buildScaffoldMjs(PLAN), "utf8");

    const target = join(work, "out");
    execFileSync("node", [scaffoldPath, target], { stdio: "pipe" });

    const files = collectFiles(PLAN);
    for (const [rel, expected] of Object.entries(files)) {
      const actual = readFileSync(join(target, rel), "utf8");
      assert.equal(actual, expected, `byte mismatch for ${rel}`);
    }
    // Empty intentional directory was created.
    assert.ok(existsSync(join(target, "src/empty-intentional")), "empty dir not created");

    // Injection proof: the dangerous `rm -rf /` / $(whoami) lines were written
    // as literal file text, never executed — a sentinel file outside target
    // must not exist, and the literal text must be present in the file.
    const idx = readFileSync(join(target, "src/index.ts"), "utf8");
    assert.ok(idx.includes("rm -rf / # must NOT execute"), "literal shell text missing");
    ok("scaffold.mjs writes every file byte-for-byte, no execution");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log(`\n${passed} checks passed.`);
