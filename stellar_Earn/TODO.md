# TODO - Strict TSConfig layering (src vs test)

- [x] Inspect current TypeScript/Jest configuration in BackEnd
- [x] Create `BackEnd/tsconfig.src.json` (src layer)
- [x] Create `BackEnd/tsconfig.test.json` (test layer with moderate strictness)
- [x] Update `BackEnd/tsconfig.build.json` to extend `tsconfig.src.json`
- [x] Update `BackEnd/test/jest-integration.json` to use `./tsconfig.test.json`
- [x] Update `BackEnd/test/jest-e2e.json` to use `./tsconfig.test.json`
- [ ] Run unit/integration/e2e tests to validate type errors (environment setup needed: ensure `node`/`npm` are available)
- [ ] Fix any strict type errors found in tests (if any)
- [ ] Update documentation (testing guide) describing the new tsconfig layering

