Orphaned Scripts Detector
=========================

Overview
--------

A small Node.js detector checks for scripts under `scripts/` and `BackEnd/scripts/` that have no references elsewhere in the repository. The detector is run in CI and will fail the build if orphaned scripts are found.

Usage
-----

Run locally:

```bash
node scripts/check-orphaned-scripts.js
```

Run unit tests (requires Node >= 18):

```bash
npm test
```

CI
--

The CI job `orphaned-scripts-check` in `.github/workflows/ci.yml` checks the repository using the detector. If the detector finds orphaned scripts, the job exits non-zero and fails the pipeline.

Allow-listing
-------------

If certain standalone scripts are intentionally unmanaged (maintenance helpers, one-off deploy scripts), update the CI job or the detector to include an allow-list. A future enhancement would be to support a `.orphaned-scripts-allowlist.json` file read by the detector.

Notes for contributors
----------------------

- The detector exports functions for testing in `scripts/check-orphaned-scripts.js`.
- Tests live in `tests/` and are runnable via `npm test`.
