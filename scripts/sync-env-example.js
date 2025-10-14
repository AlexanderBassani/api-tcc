#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env não encontrado');
  process.exit(1);
}

console.log('📝 Sincronizando .env.example com .env...');

// Lê o arquivo .env
const envContent = fs.readFileSync(envPath, 'utf8');

// Remove valores sensíveis
const envExampleContent = envContent
  .split('\n')
  .map(line => {
    // Ignora linhas vazias e comentários
    if (!line.trim() || line.trim().startsWith('#')) {
      return line;
    }

    // Remove valores sensíveis
    const replacements = {
      'DB_PASSWORD=': 'DB_PASSWORD=password',
      'JWT_SECRET=': 'JWT_SECRET=your-secret-key-change-this-in-production',
      'JWT_REFRESH_SECRET=': 'JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production',
      'EMAIL_USER=': 'EMAIL_USER=your-email@gmail.com',
      'EMAIL_PASSWORD=': 'EMAIL_PASSWORD=your-app-password',
      'NODE_ENV=production': 'NODE_ENV=development',
    };

    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(key)) {
        return value;
      }
    }

    return line;
  })
  .join('\n');

// Escreve o arquivo .env.example
fs.writeFileSync(envExamplePath, envExampleContent);

console.log('✅ .env.example atualizado com sucesso!');
console.log('📄 Arquivo: ' + envExamplePath);
