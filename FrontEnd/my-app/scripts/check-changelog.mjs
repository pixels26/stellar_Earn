#!/usr/bin/env node
/**
 * FE-068 — Frontend changelog policy enforcement.
 *
 * Verifies that any PR which modifies a "watched" type/model file also
 * either:
 *   1. modifies `FrontEnd/my-app/CHANGELOG.md`, OR
 *   2. adds a new file under `FrontEnd/my-app/.changeset/` (excluding
 *      README.md and TEMPLATE.md), OR
 *   3. opts out via `[changelog-skip]` in the PR title or any commit
 *      message in the range, or the `changelog-skip` label (handled by
 *      the GitHub Actions workflow).
 *
 * Usage:
 *   node scripts/check-changelog.mjs                # compare HEAD vs merge-base with origin/main
 *   node scripts/check-changelog.mjs --base <ref>   # explicit base ref
 *   node scripts/check-changelog.mjs --staged       # check staged files only (pre-commit)
 *
 * Exit codes:
 *   0 — OK (no watched files changed, OR a changelog entry was added, OR skipped)
 *   1 — Violation (watched file changed without changelog/changeset)
 *   2 — Tool error (git unavailable, etc.)
 *
 * No third-party dependencies. Node ≥ 18.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..'); // /…/stellar_Earn
const feRoot = resolve(__dirname, '..'); // /…/stellar_Earn/FrontEnd/my-app

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const STAGED_ONLY = flag('--staged');
const BASE_REF = opt('--base', process.env.CHANGELOG_BASE_REF || '');
const QUIET = flag('--quiet');

// ---------------------------------------------------------------------------
// Watched paths (POSIX-style, relative to repo root)
// ---------------------------------------------------------------------------
const WATCHED = [
  /^FrontEnd\/my-app\/lib\/types\//,
  /^FrontEnd\/my-app\/lib\/api\//,
  /^FrontEnd\/my-app\/lib\/schemas\//,
  /^FrontEnd\/my-app\/lib\/validation\//,
  /^FrontEnd\/my-app\/context\/walletTypes\.ts$/,
];

const CHANGELOG_PATH = /^FrontEnd\/my-app\/CHANGELOG\.md$/;
const CHANGESET_FILE = /^FrontEnd\/my-app\/\.changeset\/(?!README\.md$|TEMPLATE\.md$).+\.md$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    .toString()
    .trim();
}

function log(...a) {
  if (!QUIET) console.log('[changelog-check]', ...a);
}
function warn(...a) {
  console.warn('[changelog-check] ⚠', ...a);
}
function fail(msg) {
  console.error(`\n❌ [changelog-check] ${msg}\n`);
  process.exit(1);
}

function getChangedFiles() {
  if (STAGED_ONLY) {
    return sh('git diff --name-only --cached').split('\n').filter(Boolean);
  }

  // Resolve the base ref.
  let base = BASE_REF;
  if (!base) {
    // Try common defaults in order.
    const candidates = [
      'origin/main',
      'origin/master',
      'upstream/main',
      'upstream/master',
      'main',
      'master',
    ];
    for (const c of candidates) {
      try {
        sh(`git rev-parse --verify --quiet ${c}^{commit}`);
        base = c;
        break;
      } catch {
        /* keep trying */
      }
    }
  }

  if (!base) {
    warn(
      'No base ref found (tried origin/main, origin/master, main, master). ' +
        'Falling back to HEAD~1.',
    );
    base = 'HEAD~1';
  }

  let mergeBase;
  try {
    mergeBase = sh(`git merge-base ${base} HEAD`);
  } catch {
    mergeBase = base;
  }

  log(`Comparing HEAD against ${base} (merge-base ${mergeBase.slice(0, 8)})`);
  return sh(`git diff --name-only ${mergeBase}...HEAD`)
    .split('\n')
    .filter(Boolean);
}

function isSkipRequested(changedFiles) {
  // 1. Env var (set by the GH workflow when the `changelog-skip` label is present).
  if (process.env.CHANGELOG_SKIP === '1' || process.env.CHANGELOG_SKIP === 'true') {
    return 'env CHANGELOG_SKIP=1';
  }
  // 2. PR title / commit messages.
  const needles = [/\[changelog-skip\]/i, /\[skip changelog\]/i];
  const prTitle = process.env.PR_TITLE || '';
  if (needles.some((r) => r.test(prTitle))) return `PR title contains skip token`;

  try {
    const msgs = sh('git log -50 --pretty=%B');
    if (needles.some((r) => r.test(msgs))) return 'commit message contains skip token';
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  // Sanity checks
  if (!existsSync(resolve(feRoot, 'CHANGELOG.md'))) {
    fail(
      `CHANGELOG.md is missing at ${resolve(feRoot, 'CHANGELOG.md')}. ` +
        'See docs/TYPE_CHANGES_POLICY.md.',
    );
  }
  if (!existsSync(resolve(feRoot, '.changeset'))) {
    fail(
      `.changeset/ directory is missing at ${resolve(feRoot, '.changeset')}. ` +
        'See docs/TYPE_CHANGES_POLICY.md.',
    );
  }

  let changed;
  try {
    changed = getChangedFiles();
  } catch (e) {
    console.error('[changelog-check] git failed:', e.message);
    process.exit(2);
  }

  if (changed.length === 0) {
    log('No file changes detected — nothing to verify. ✅');
    process.exit(0);
  }

  const watchedHits = changed.filter((f) => WATCHED.some((r) => r.test(f)));
  if (watchedHits.length === 0) {
    log(`No watched type/model files changed (${changed.length} files diffed). ✅`);
    process.exit(0);
  }

  log(`Watched files modified (${watchedHits.length}):`);
  watchedHits.forEach((f) => log('  •', f));

  const skipReason = isSkipRequested(changed);
  if (skipReason) {
    log(`Skip token detected (${skipReason}) — bypassing changelog requirement. ⚠ ✅`);
    process.exit(0);
  }

  const changelogTouched = changed.some((f) => CHANGELOG_PATH.test(f));
  const changesetAdded = changed.some((f) => CHANGESET_FILE.test(f));

  if (changelogTouched) {
    log('CHANGELOG.md was updated in this diff. ✅');
    process.exit(0);
  }
  if (changesetAdded) {
    log('A .changeset/*.md file was added in this diff. ✅');
    process.exit(0);
  }

  // Hard fail with an instructive message.
  const watchedList = watchedHits.map((f) => `  • ${f}`).join('\n');
  fail(
    `This PR modifies watched frontend type/model files but does NOT update
${'   '}FrontEnd/my-app/CHANGELOG.md and does NOT add a .changeset/*.md entry.

Watched files changed:
${watchedList}

Resolve in one of these ways:

  1. Add a bullet under "## [Unreleased]" in
     FrontEnd/my-app/CHANGELOG.md (preferred for single-PR work).
  2. Create a new file in FrontEnd/my-app/.changeset/ based on
     FrontEnd/my-app/.changeset/TEMPLATE.md (preferred when several PRs
     target the same release).
  3. If the change is truly non-breaking, add the "changelog-skip" label
     to the PR or include "[changelog-skip]" in the PR title /
     commit message.

Full policy: FrontEnd/my-app/docs/TYPE_CHANGES_POLICY.md`,
  );
}

// Defensive: list .changeset for friendly error messages
try {
  readdirSync(resolve(feRoot, '.changeset'));
} catch {
  /* the existsSync check above handles this */
}

main();
