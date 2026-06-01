const assert = require("assert");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const PRE_COMMIT_HOOK = path.join(REPO_ROOT, ".githooks", "pre-commit");

function testPreCommitHookExistsAndIsExecutable() {
  assert.ok(fs.existsSync(PRE_COMMIT_HOOK), "pre-commit hook should exist");
  const stats = fs.statSync(PRE_COMMIT_HOOK);
  assert.ok(stats.isFile());
  assert.notStrictEqual(
    stats.mode & 0o111,
    0,
    "pre-commit hook should be executable",
  );
}

function testPreCommitHookRunsContractAndLintStagedChecks() {
  const contents = fs.readFileSync(PRE_COMMIT_HOOK, "utf8");

  assert.match(contents, /cargo fmt/);
  assert.match(contents, /cargo clippy/);
  assert.match(contents, /lint-staged/);
  assert.match(contents, /SKIP_CONTRACT_HOOKS/);
  assert.match(contents, /SKIP_LINT_STAGED/);
}

function testInstallHooksScriptReferencesGithooks() {
  const installScript = fs.readFileSync(
    path.join(REPO_ROOT, "scripts", "install-hooks.sh"),
    "utf8",
  );

  assert.match(installScript, /\.githooks/);
  assert.match(installScript, /SKIP_LINT_STAGED/);
}

function runAll() {
  testPreCommitHookExistsAndIsExecutable();
  testPreCommitHookRunsContractAndLintStagedChecks();
  testInstallHooksScriptReferencesGithooks();
}

module.exports = { runAll };
