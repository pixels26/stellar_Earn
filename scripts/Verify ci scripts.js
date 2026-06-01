name: Verify CI Scripts

on:
pull_request:
paths:
- '.github/workflows/**'
    - '**/package.json'
    - 'scripts/verify-ci-scripts.js'
push:
branches:
- main
    - master

jobs:
verify - scripts:
name: Verify all CI scripts exist
runs - on: ubuntu - latest

steps:
- name: Checkout repository
uses: actions / checkout@v4

- name: Setup Node.js
uses: actions / setup - node@v4
with:
node - version: '20'

    - name: Setup pnpm
uses: pnpm / action - setup@v3
with:
version: 8

    - name: Get pnpm store directory
id: pnpm - cache
run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

    - name: Cache pnpm store
uses: actions / cache@v4
with:
path: ${ { steps.pnpm - cache.outputs.STORE_PATH } }
key: ${ { runner.os } } -pnpm - ${ { hashFiles('**/pnpm-lock.yaml') } }
restore - keys: |
    ${ { runner.os } } -pnpm -

        - name: Install dependencies
run: pnpm install--frozen - lockfile

    - name: Run CI script verification(existence check)
run: node scripts / verify - ci - scripts.js--dry - run

    - name: Annotate missing scripts
if: failure()
run: node scripts / verify - ci - scripts.js--dry - run--fix