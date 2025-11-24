// Setup global para todos os testes Jest
// Este arquivo é executado antes de cada arquivo de teste

// Define NODE_ENV como test para desabilitar CSRF e outras configurações específicas de produção
process.env.NODE_ENV = 'test';

// Suprime logs desnecessários durante os testes
process.env.LOG_LEVEL = 'error';

// Configurações específicas para testes
console.log('🧪 Configuração de teste aplicada: NODE_ENV=test, LOG_LEVEL=error');