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

/**
 * Gera uma placa única para testes
 * @param {string} format - Formato da placa ('old' para ABC1234, 'mercosul' para ABC1D23)
 * @returns {string} Placa única
 */
function generateTestPlate(format = 'mercosul') {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const getRandomLetter = () => letters[Math.floor(Math.random() * letters.length)];
  const getRandomNumber = () => Math.floor(Math.random() * 10);
  
  if (format === 'old') {
    // Formato antigo: ABC1234
    return `${getRandomLetter()}${getRandomLetter()}${getRandomLetter()}${getRandomNumber()}${getRandomNumber()}${getRandomNumber()}${getRandomNumber()}`;
  } else {
    // Formato Mercosul: ABC1D23
    return `${getRandomLetter()}${getRandomLetter()}${getRandomLetter()}${getRandomNumber()}${getRandomLetter()}${getRandomNumber()}${getRandomNumber()}`;
  }
}

module.exports = {
  generateTestUsername,
  generateTestEmail,
  generateTestPlate
};
