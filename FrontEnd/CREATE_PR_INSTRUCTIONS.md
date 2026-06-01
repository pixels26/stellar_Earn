# Create PR - Step by Step Instructions

## Step 1: Prepare Your Git Branch

```bash
# Stage all new test files and documentation
git add tests/e2e/config-error-panel.spec.ts
git add components/providers/EnvValidator.test.tsx
git add app/error-panel-demo/page.tsx
git add CONFIG_ERROR_PANEL_TESTS.md
git add TESTS_QUICK_REFERENCE.md
git add FE_038_PR_DESCRIPTION.md
git add FE_038_IMPLEMENTATION_CHECKLIST.md
git add FE_038_SUMMARY.md

# Or stage all at once (if only adding test-related files)
git add -A
```

## Step 2: Create Commit

```bash
git commit -m "feat(tests): add visual and unit tests for config error panel rendering

BREAKING CHANGE: none

Issue: FE-038

## Summary
Add comprehensive visual and unit tests for the config error panel rendering path
in the EnvValidator component. Tests verify proper display of environment variable
validation errors with user-friendly guidance.

## Changes
- Add E2E visual tests with Playwright (13 tests)
- Add unit tests with Vitest (25+ tests)
- Add demo page for test environment
- Add comprehensive documentation

## Test Coverage
- Visual regression testing with snapshots
- Responsive design (desktop, tablet, mobile)
- Accessibility validation (WCAG 2.1 AA)
- Error message and help section rendering
- Loading state transitions
- Interactive elements and links

## Documentation
- CONFIG_ERROR_PANEL_TESTS.md: Complete implementation guide
- TESTS_QUICK_REFERENCE.md: Quick reference for running tests
- FE_038_PR_DESCRIPTION.md: PR overview
- FE_038_IMPLEMENTATION_CHECKLIST.md: Verification checklist

## Acceptance Criteria
✅ Implementation properly addresses the issue requirements
✅ All related tests pass (38+ tests)
✅ No regression in existing functionality
✅ Code follows project coding standards
✅ Documentation is updated and comprehensive
✅ Performance impact is minimal
✅ Accessibility guidelines are followed
✅ Security considerations are addressed

## Testing
Run tests with:
- \`pnpm test\` (unit tests)
- \`pnpm playwright test\` (E2E tests)
- \`pnpm run test:all\` (all tests)

## Files Changed
- tests/e2e/config-error-panel.spec.ts (NEW)
- components/providers/EnvValidator.test.tsx (NEW)
- app/error-panel-demo/page.tsx (NEW)
- CONFIG_ERROR_PANEL_TESTS.md (NEW)
- TESTS_QUICK_REFERENCE.md (NEW)
- FE_038_PR_DESCRIPTION.md (NEW)
- FE_038_IMPLEMENTATION_CHECKLIST.md (NEW)
- FE_038_SUMMARY.md (NEW)

Closes #FE-038"
```

## Step 3: Create Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feat/fe-038-config-error-panel-tests

# Push branch to remote
git push -u origin feat/fe-038-config-error-panel-tests
```

## Step 4: Create Pull Request on GitHub

Go to: https://github.com/[YOUR_ORG]/[YOUR_REPO]/pull/new/feat/fe-038-config-error-panel-tests

Or use GitHub CLI:
```bash
gh pr create --title "[FE-038] Add visual tests for config error panel rendering" \
  --body-file PR_BODY.md \
  --assignee [YOUR_USERNAME] \
  --label "feature,testing,fe-038"
```

## Step 5: PR Details

**Title:**
```
[FE-038] Add visual tests for config error panel rendering path
```

**Description:** See PR_BODY_TEMPLATE.md (below)

**Labels:**
- feature
- testing
- e2e-tests
- accessibility

**Reviewers:** (Optional - add team members)

**Assignee:** (Yourself or PR author)

---

## Quick Commands Summary

```bash
# All in one
git add -A && \
git commit -m "[FE-038] Add visual and unit tests for config error panel" && \
git push origin feat/fe-038-config-error-panel-tests
```

Then open GitHub and create PR from the branch.

## Troubleshooting

### If tests are not committed yet
```bash
# Verify files exist
ls -la tests/e2e/config-error-panel.spec.ts
ls -la components/providers/EnvValidator.test.tsx
ls -la app/error-panel-demo/page.tsx

# Check git status
git status
```

### If need to amend commit
```bash
git add [files]
git commit --amend --no-edit
git push -f origin feat/fe-038-config-error-panel-tests
```

### If need to reset
```bash
git reset HEAD~1      # Undo commit, keep changes
git checkout -- .     # Discard all changes
```
