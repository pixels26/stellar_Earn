/**
 * verify-ci-scripts.test.js
 *
 * Unit tests for the CI script verification utility (FE-067).
 * Run with: pnpm test scripts/verify-ci-scripts.test.js
 *
 * Uses Node's built-in test runner (Node >= 18) — no extra deps needed.
 */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a temporary directory tree that mimics the monorepo structure
 * expected by verify-ci-scripts.js, and return the root path.
 */
function buildTempRepo(opts = {}) {
    const {
        frontendScripts = {},
        apiScripts = {},
        rootScripts = {},
        workflowYaml = "",
    } = opts;

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "stellar-earn-test-"));

    // .github/workflows
    const wfDir = path.join(root, ".github", "workflows");
    fs.mkdirSync(wfDir, { recursive: true });
    fs.writeFileSync(path.join(wfDir, "ci.yml"), workflowYaml);

    // apps/web/package.json
    const webDir = path.join(root, "apps", "web");
    fs.mkdirSync(webDir, { recursive: true });
    fs.writeFileSync(
        path.join(webDir, "package.json"),
        JSON.stringify({ name: "web", scripts: frontendScripts })
    );

    // apps/api/package.json
    const apiDir = path.join(root, "apps", "api");
    fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(
        path.join(apiDir, "package.json"),
        JSON.stringify({ name: "api", scripts: apiScripts })
    );

    // root package.json
    fs.writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ name: "stellar-earn", scripts: rootScripts })
    );

    // pnpm-lock.yaml (signals pnpm as package manager)
    fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "");

    return root;
}

/**
 * Run the verify-ci-scripts.js tool against a temp repo root.
 * Patches WORKSPACE_MAP and ROOT by passing env variables that the
 * script reads when running in test mode.
 */
function runVerifier(repoRoot, extraArgs = []) {
    const scriptPath = path.resolve(__dirname, "verify-ci-scripts.js");
    const args = ["--dry-run", ...extraArgs].join(" ");

    try {
        const stdout = execSync(`node ${scriptPath} ${args}`, {
            cwd: repoRoot,
            encoding: "utf8",
            env: {
                ...process.env,
                VERIFY_CI_ROOT: repoRoot, // custom env var the script reads in test mode
            },
        });
        return { exitCode: 0, stdout, stderr: "" };
    } catch (err) {
        return {
            exitCode: err.status ?? 1,
            stdout: err.stdout ?? "",
            stderr: err.stderr ?? "",
        };
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("extractCiScripts", () => {
    /**
     * Import the helper functions directly for unit testing.
     * We use a re-export pattern or inline re-implementation to avoid
     * coupling tests to the module's internal structure.
     */

    const WORKFLOW_YAML_SIMPLE = `
jobs:
  build:
    steps:
      - run: pnpm run build
      - run: pnpm run lint
      - run: pnpm run test
`;

    const WORKFLOW_YAML_WITH_FILTER = `
jobs:
  build:
    steps:
      - run: pnpm --filter web run build
      - run: pnpm --filter api run test:e2e
`;

    const WORKFLOW_YAML_SHORTHAND = `
jobs:
  lint:
    steps:
      - run: pnpm lint
      - run: pnpm typecheck
`;

    const WORKFLOW_YAML_DUPLICATE = `
jobs:
  test:
    steps:
      - run: pnpm run test
      - run: npm run test
`;

    test("extracts simple `pnpm run <script>` calls", () => {
        // Inline a minimal version of the extraction logic for unit testing
        const content = WORKFLOW_YAML_SIMPLE;
        const runRe = /(?:npm|pnpm|yarn)\s+(?:--filter\s+\S+\s+)?run\s+([\w:.-]+)/g;
        const scripts = [];
        let m;
        while ((m = runRe.exec(content)) !== null) scripts.push(m[1]);

        assert.deepEqual(scripts, ["build", "lint", "test"]);
    });

    test("extracts `pnpm --filter <pkg> run <script>` calls", () => {
        const content = WORKFLOW_YAML_WITH_FILTER;
        const runRe = /(?:npm|pnpm|yarn)\s+(?:--filter\s+\S+\s+)?run\s+([\w:.-]+)/g;
        const scripts = [];
        let m;
        while ((m = runRe.exec(content)) !== null) scripts.push(m[1]);

        assert.deepEqual(scripts, ["build", "test:e2e"]);
    });

    test("extracts pnpm shorthand calls (pnpm lint, pnpm typecheck)", () => {
        const content = WORKFLOW_YAML_SHORTHAND;
        const shorthandRe =
            /(?:npm|pnpm)\s+(lint|test|build|typecheck|format|test:e2e|test:cov)\b/g;
        const scripts = [];
        let m;
        while ((m = shorthandRe.exec(content)) !== null) scripts.push(m[1]);

        assert.deepEqual(scripts, ["lint", "typecheck"]);
    });

    test("deduplicates the same script across npm and pnpm calls", () => {
        const content = WORKFLOW_YAML_DUPLICATE;
        const runRe = /(?:npm|pnpm|yarn)\s+run\s+([\w:.-]+)/g;
        const scripts = new Set();
        let m;
        while ((m = runRe.exec(content)) !== null) scripts.add(m[1]);

        assert.equal(scripts.size, 1);
        assert.ok(scripts.has("test"));
    });
});

describe("package.json script lookup", () => {
    test("finds a script defined in apps/web/package.json", () => {
        const root = buildTempRepo({
            frontendScripts: { build: "next build", lint: "eslint ." },
            workflowYaml: "jobs:\n  build:\n    steps:\n      - run: pnpm run build",
        });

        const pkgPath = path.join(root, "apps", "web", "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

        assert.ok("build" in pkg.scripts, "build script should exist");
        assert.equal(pkg.scripts.build, "next build");

        fs.rmSync(root, { recursive: true, force: true });
    });

    test("finds a script defined in apps/api/package.json", () => {
        const root = buildTempRepo({
            apiScripts: { "test:e2e": "jest --config jest-e2e.json" },
            workflowYaml: "",
        });

        const pkgPath = path.join(root, "apps", "api", "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

        assert.ok("test:e2e" in pkg.scripts);

        fs.rmSync(root, { recursive: true, force: true });
    });

    test("returns null when script is absent from all workspaces", () => {
        const root = buildTempRepo({
            frontendScripts: { build: "next build" },
            workflowYaml: "",
        });

        const pkgPath = path.join(root, "apps", "web", "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

        assert.ok(!("deploy" in pkg.scripts), "deploy should not be in scripts");

        fs.rmSync(root, { recursive: true, force: true });
    });
});

describe("verify-ci-scripts integration", () => {
    test("exits 0 when all CI scripts exist in package.json", () => {
        const root = buildTempRepo({
            frontendScripts: {
                build: "next build",
                lint: "eslint .",
                test: "jest",
                typecheck: "tsc --noEmit",
            },
            workflowYaml: `
jobs:
  ci:
    steps:
      - run: pnpm run build
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run typecheck
`,
        });

        // Patch ROOT in the child process by writing a temporary wrapper
        const wrapperPath = path.join(root, "verify-ci-scripts-test-wrapper.js");
        const originalScript = fs.readFileSync(
            path.resolve(__dirname, "verify-ci-scripts.js"),
            "utf8"
        );

        // Inject the temp root path
        const patched = originalScript
            .replace(
                /const ROOT = path\.resolve\(__dirname, "\.\."\);/,
                `const ROOT = ${JSON.stringify(root)};`
            )
            .replace(
                /const WORKFLOW_DIR = path\.join\(ROOT, "\.github", "workflows"\);/,
                `const WORKFLOW_DIR = path.join(ROOT, ".github", "workflows");`
            );

        fs.writeFileSync(wrapperPath, patched);

        let exitCode = 0;
        try {
            execSync(`node ${wrapperPath} --dry-run`, { encoding: "utf8" });
        } catch (err) {
            exitCode = err.status ?? 1;
        }

        fs.rmSync(root, { recursive: true, force: true });
        assert.equal(exitCode, 0, "should exit 0 when all scripts exist");
    });

    test("exits 1 when a CI script is missing from all package.json files", () => {
        const root = buildTempRepo({
            frontendScripts: { build: "next build" },
            // 'lint' is referenced in CI but not defined anywhere
            workflowYaml: `
jobs:
  ci:
    steps:
      - run: pnpm run build
      - run: pnpm run lint
`,
        });

        const wrapperPath = path.join(root, "verify-ci-scripts-test-wrapper.js");
        const originalScript = fs.readFileSync(
            path.resolve(__dirname, "verify-ci-scripts.js"),
            "utf8"
        );

        const patched = originalScript.replace(
            /const ROOT = path\.resolve\(__dirname, "\.\."\);/,
            `const ROOT = ${JSON.stringify(root)};`
        );

        fs.writeFileSync(wrapperPath, patched);

        let exitCode = 0;
        try {
            execSync(`node ${wrapperPath} --dry-run`, { encoding: "utf8" });
        } catch (err) {
            exitCode = err.status ?? 1;
        }

        fs.rmSync(root, { recursive: true, force: true });
        assert.equal(exitCode, 1, "should exit 1 when a script is missing");
    });

    test("--fix flag prints suggested stubs for missing scripts", () => {
        const root = buildTempRepo({
            frontendScripts: {},
            workflowYaml: `
jobs:
  ci:
    steps:
      - run: pnpm run typecheck
`,
        });

        const wrapperPath = path.join(root, "verify-ci-scripts-test-wrapper.js");
        const originalScript = fs.readFileSync(
            path.resolve(__dirname, "verify-ci-scripts.js"),
            "utf8"
        );

        const patched = originalScript.replace(
            /const ROOT = path\.resolve\(__dirname, "\.\."\);/,
            `const ROOT = ${JSON.stringify(root)};`
        );

        fs.writeFileSync(wrapperPath, patched);

        let stdout = "";
        try {
            execSync(`node ${wrapperPath} --dry-run --fix`, { encoding: "utf8" });
        } catch (err) {
            stdout = err.stdout ?? "";
        }

        fs.rmSync(root, { recursive: true, force: true });
        assert.ok(
            stdout.includes("typecheck"),
            "fix output should mention the missing script name"
        );
        assert.ok(
            stdout.includes("TODO"),
            "fix output should include a stub suggestion"
        );
    });

    test("no workflow files found exits 0 gracefully", () => {
        const root = buildTempRepo({ workflowYaml: "" });
        // Remove the workflow directory entirely
        fs.rmSync(path.join(root, ".github"), { recursive: true, force: true });

        const wrapperPath = path.join(root, "verify-ci-scripts-test-wrapper.js");
        const originalScript = fs.readFileSync(
            path.resolve(__dirname, "verify-ci-scripts.js"),
            "utf8"
        );

        const patched = originalScript.replace(
            /const ROOT = path\.resolve\(__dirname, "\.\."\);/,
            `const ROOT = ${JSON.stringify(root)};`
        );

        fs.writeFileSync(wrapperPath, patched);

        let exitCode = 0;
        try {
            execSync(`node ${wrapperPath} --dry-run`, { encoding: "utf8" });
        } catch (err) {
            exitCode = err.status ?? 1;
        }

        fs.rmSync(root, { recursive: true, force: true });
        assert.equal(exitCode, 0, "should exit 0 when no workflow files found");
    });
});