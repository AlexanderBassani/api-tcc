/**
 * Helper to ensure app is ready before tests run
 * Waits for TypeORM initialization to complete
 */
const waitForApp = async (app) => {
  if (app.typeormReady) {
    await app.typeormReady;
  }
  return app;
};

module.exports = { waitForApp };
