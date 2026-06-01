# Frontend Changelog

All notable changes to the **StellarEarn Frontend** (`FrontEnd/my-app`) are
documented in this file.

The format is based on
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **鈿狅笍 Breaking type / model changes MUST be recorded here.**
> See
> [`docs/TYPE_CHANGES_POLICY.md`](./docs/TYPE_CHANGES_POLICY.md)
> for the full policy, definitions, and examples. PRs that modify files under
> `lib/types/**`, `lib/api/**`, `lib/schemas/**` or `lib/validation/**` are
> automatically checked by the
> [`Frontend Changelog`](../../.github/workflows/frontend-changelog.yml)
> workflow.

---

## Section Legend

Each release block uses the following ordered sections (omit empty ones):

| Section                         | Use for                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| **馃挜 Breaking 鈥� Types/Models**  | Any incompatible change to a TypeScript type, interface, enum, Zod schema, or API response shape |
| **馃挜 Breaking 鈥� Runtime/API**   | Any incompatible runtime behaviour, route, prop, or env-var change                               |
| **鉁� Added**                    | New features, types, hooks, or models (additive only)                                            |
| **馃洜 Changed**                  | Backwards-compatible changes to existing behaviour                                               |
| **鉀� Deprecated**               | Soon-to-be-removed types or APIs                                                                 |
| **馃棏 Removed**                  | Previously-deprecated types or APIs that are now gone                                            |
| **馃悰 Fixed**                    | Bug fixes                                                                                        |
| **馃敀 Security**                 | Vulnerability fixes                                                                              |

Every **馃挜 Breaking 鈥� Types/Models** entry must include:

1. The fully-qualified symbol (e.g. `lib/types/quest.ts 鈫� QuestStatus`).
2. A one-line summary of the change.
3. A **Migration** sub-bullet showing the before 鈫� after code.
4. The PR or issue number (e.g. `(#068)`).

---

## [Unreleased]

### 馃挜 Breaking 鈥� Types/Models

_None yet._

### 鉁� Added

- **Frontend changelog policy** for breaking type / model changes
  ([FE-068](https://github.com/Kappa16/stellar_Earn/issues/068)).
    - New canonical `FrontEnd/my-app/CHANGELOG.md` (this file).
      - New policy document at
          [`docs/TYPE_CHANGES_POLICY.md`](./docs/TYPE_CHANGES_POLICY.md).
            - New lightweight changeset workflow under
                [`.changeset/`](./.changeset/README.md).
                  - New CI guard
                      [`scripts/check-changelog.mjs`](./scripts/check-changelog.mjs) wired into
                          `npm run changelog:check` and the
                              [`frontend-changelog.yml`](../../.github/workflows/frontend-changelog.yml)
                                  workflow.

                                  ### 馃洜 Changed

                                  - Updated root [`CONTRIBUTING.md`](../../CONTRIBUTING.md) and the
                                    [PR template](../../.github/pull_request_template.md) with a "Breaking
                                      Type/Model Changes" checklist that links to this changelog.

                                      ### 鉀� Deprecated

                                      _None yet._

                                      ### 馃棏 Removed

                                      _None yet._

                                      ### 馃悰 Fixed

                                      _None yet._

                                      ### 馃敀 Security

                                      _None yet._

                                      ---

                                      ## Worked Example 鈥� How to Document a Breaking Type Change

                                      > The following block is **illustrative only** 鈥� keep it at the bottom of the
                                      > file forever as a template for new contributors.

                                      ```markdown
                                      ## [1.2.0] 鈥� 2026-06-15

                                      ### 馃挜 Breaking 鈥� Types/Models

                                      - **`lib/types/quest.ts 鈫� QuestStatus`** 鈥� renamed `PAUSED` to `ON_HOLD` to
                                        match the new contract event name. (#412)

                                          **Migration:**

                                            ```ts
                                              // before
                                                import { QuestStatus } from '@/lib/types';
                                                  if (quest.status === QuestStatus.PAUSED) { 鈥� }

                                                    // after
                                                      import { QuestStatus } from '@/lib/types';
                                                        if (quest.status === QuestStatus.ON_HOLD) { 鈥� }
                                                          ```

                                                          - **`lib/types/api.types.ts 鈫� PaginationMeta`** 鈥� `cursor` is now required
                                                            (was optional). All consumers must pass a cursor when paginating. (#418)

                                                              **Migration:**

                                                                ```ts
                                                                  // before
                                                                    const meta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false };

                                                                      // after
                                                                        const meta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false, cursor: '' };
                                                                          ```
                                                                          ```

                                                                          ---

                                                                          [Unreleased]: https://github.com/Kappa16/stellar_Earn/compare/HEAD