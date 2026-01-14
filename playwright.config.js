// basic Playwright config
module.exports = {
  testDir: 'tests/e2e',
  timeout: 30 * 1000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 }
  }
};
