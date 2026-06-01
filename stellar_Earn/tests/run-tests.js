const { runAll } = require('./check-orphaned-scripts.test');

try {
  runAll();
  console.log('All tests passed');
  process.exit(0);
} catch (e) {
  console.error('Tests failed:', e && e.stack ? e.stack : e);
  process.exit(1);
}
