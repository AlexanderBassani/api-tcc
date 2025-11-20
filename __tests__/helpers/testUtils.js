/**
 * Utilitários para testes
 */

/**
 * Gera um username único para testes (máx 30 caracteres)
 * @param {string} base - Nome base do username (ex: 'admin')
 * @returns {string} Username único (ex: 'admin_420123_45')
 */
function generateTestUsername(base) {
  const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
  const random = Math.floor(Math.random() * 100); // 0-99
  return `${base}_${timestamp}_${random}`;
}

/**
 * Gera um email único para testes
 * @param {string} base - Nome base do email (ex: 'test')
 * @returns {string} Email único (ex: 'test_1732113420123_456@test.com')
 */
function generateTestEmail(base) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${base}_${timestamp}_${random}@test.com`;
}

module.exports = {
  generateTestUsername,
  generateTestEmail
};
