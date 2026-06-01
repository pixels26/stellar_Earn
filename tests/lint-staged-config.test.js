const assert = require("assert");
const path = require("path");

const lintStagedConfig = require("../lint-staged.config.js");

function testConfigExportsExpectedGlobs() {
  assert.ok(typeof lintStagedConfig === "object");
  assert.ok(Array.isArray(Object.keys(lintStagedConfig)));
  assert.ok(Object.keys(lintStagedConfig).length >= 3);

  const globs = Object.keys(lintStagedConfig);
  assert.ok(globs.some((glob) => glob.includes("FrontEnd/my-app")));
  assert.ok(globs.some((glob) => glob.includes("BackEnd")));
  assert.ok(globs.some((glob) => glob.includes("scripts")));
}

function testFrontendCommandsUseProjectTools() {
  const frontendGlob = Object.keys(lintStagedConfig).find((glob) =>
    glob.includes("FrontEnd/my-app"),
  );
  const run = lintStagedConfig[frontendGlob];
  const files = [
    path.join("FrontEnd/my-app/components/Button.tsx"),
    path.join("FrontEnd/my-app/lib/utils.ts"),
  ];
  const commands = run(files);

  assert.strictEqual(commands.length, 2);
  assert.match(commands[0], /cd FrontEnd\/my-app && npx prettier --write/);
  assert.match(commands[1], /cd FrontEnd\/my-app && npx eslint --fix/);
  assert.match(commands[0], /components\/Button\.tsx/);
  assert.match(commands[1], /lib\/utils\.ts/);
}

function testBackendCommandsUseProjectTools() {
  const backendGlob = Object.keys(lintStagedConfig).find((glob) =>
    glob.includes("BackEnd/{src,test}"),
  );
  const run = lintStagedConfig[backendGlob];
  const files = [path.join("BackEnd/src/main.ts")];
  const commands = run(files);

  assert.strictEqual(commands.length, 2);
  assert.match(commands[0], /cd BackEnd && npx prettier --write src\/main\.ts/);
  assert.match(commands[1], /cd BackEnd && npx eslint --fix src\/main\.ts/);
}

function testRootScriptFormattingUsesPrettier() {
  const rootGlob = Object.keys(lintStagedConfig).find((glob) =>
    glob.includes("{scripts,tests}"),
  );
  const run = lintStagedConfig[rootGlob];
  const files = [path.join("scripts/example.js")];
  const commands = run(files);

  assert.strictEqual(commands.length, 1);
  assert.match(commands[0], /npx prettier --write scripts\/example\.js/);
}

function runAll() {
  testConfigExportsExpectedGlobs();
  testFrontendCommandsUseProjectTools();
  testBackendCommandsUseProjectTools();
  testRootScriptFormattingUsesPrettier();
}

module.exports = { runAll };
