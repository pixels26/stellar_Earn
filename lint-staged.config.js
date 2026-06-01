const path = require('path');

const FRONTEND_DIR = 'FrontEnd/my-app';
const BACKEND_DIR = 'BackEnd';

function buildCommands(cwd, command, files) {
  const relativeFiles = files.map((file) => path.relative(cwd, file));
  if (relativeFiles.length === 0) {
    return [];
  }

  return [`cd ${cwd} && npx ${command} ${relativeFiles.join(' ')}`];
}

/** @type {import('lint-staged').Configuration} */
module.exports = {
  'FrontEnd/my-app/**/*.{js,jsx,ts,tsx,css,scss,md,json,yml,yaml}': (files) => [
    ...buildCommands(FRONTEND_DIR, 'prettier --write', files),
    ...buildCommands(FRONTEND_DIR, 'eslint --fix', files),
  ],
  'BackEnd/{src,test}/**/*.ts': (files) => [
    ...buildCommands(BACKEND_DIR, 'prettier --write', files),
    ...buildCommands(BACKEND_DIR, 'eslint --fix', files),
  ],
  'BackEnd/**/*.json': (files) =>
    buildCommands(BACKEND_DIR, 'prettier --write', files),
  '{scripts,tests}/**/*.{js,mjs,cjs,json,md,yml,yaml}': (files) => [
    `npx prettier --write ${files.join(' ')}`,
  ],
};
