const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configurações de log do ambiente
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '14d';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json'; // json ou simple

// Formato customizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  LOG_FORMAT === 'json'
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaStr = '';
      if (Object.keys(meta).length > 0 && meta.metadata && Object.keys(meta.metadata).length > 0) {
        metaStr = ` ${JSON.stringify(meta.metadata)}`;
      }
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    })
);

// Transport para logs de erro
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: LOG_MAX_SIZE,
  maxFiles: LOG_MAX_FILES,
  format: customFormat,
  zippedArchive: true
});

// Transport para logs combinados (todos os níveis)
const combinedFileRotateTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_MAX_SIZE,
  maxFiles: LOG_MAX_FILES,
  format: customFormat,
  zippedArchive: true
});

// Transport para logs HTTP (requisições)
const httpFileRotateTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'http',
  maxSize: LOG_MAX_SIZE,
  maxFiles: LOG_MAX_FILES,
  format: customFormat,
  zippedArchive: true
});

// Transport para console (desenvolvimento)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaStr = '';
      if (Object.keys(meta).length > 0 && meta.metadata && Object.keys(meta.metadata).length > 0) {
        metaStr = ` ${JSON.stringify(meta.metadata)}`;
      }
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
  )
});

// Configuração dos níveis de log customizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
  }
};

winston.addColors(customLevels.colors);

// Criar o logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: customLevels.levels,
  format: customFormat,
  transports: [
    errorFileRotateTransport,
    combinedFileRotateTransport,
    httpFileRotateTransport
  ],
  // Não parar o processo em caso de erro no logger
  exitOnError: false
});

// Adicionar console apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport);
}

// Evento de rotação de arquivo
errorFileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename, type: 'error' });
});

combinedFileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename, type: 'combined' });
});

httpFileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename, type: 'http' });
});

module.exports = logger;
