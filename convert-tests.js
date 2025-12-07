// Script para converter pool.query para TypeORM nos testes
// Este script substitui padrões comuns de pool.query

const fs = require('fs');
const path = require('path');

const testFiles = [
    'fuelRecordRoutes.test.js',
    'userRoutes.test.js',
    'vehicleRoutes.test.js',
    'maintenanceRoutes.test.js',
    'maintenanceAttachmentRoutes.test.js',
    'maintenanceTypeRoutes.test.js',
    'reminderRoutes.test.js',
    'serviceProviderRoutes.test.js',
    'preferences.test.js',
    'passwordReset.test.js'
];

const testsDir = path.join(__dirname, '__tests__');

// Adicionar imports TypeORM após a linha do AppDataSource
const addRepositoryImports = (content, entities) => {
    const appDataSourceLine = "const { AppDataSource } = require('../src/config/typeorm');";

    if (content.includes(appDataSource Line) && !content.includes('Repository = AppDataSource.getRepository')) {
        const repositoryImports = entities.map(entity =>
            `const ${entity.toLowerCase()}Repository = AppDataSource.getRepository('${entity}');`
        ).join('\n');

        return content.replace(
            appDataSourceLine,
            `${appDataSourceLine}\n\n${repositoryImports}`
        );
    }

    return content;
};

// Converter pool.query DELETE simples
const convertSimpleDeletes = (content) => {
    // DELETE FROM table WHERE column = $1
    return content.replace(
        /await pool\.query\('DELETE FROM (\w+) WHERE (\w+) = \$1', \[([^\]]+)\]\)/g,
        'await $1Repository.delete({ $2: $3 })'
    );
};

// Converter pool.query INSERT ... RETURNING
const convertInserts = (content) => {
    // Padrão complexo - precisa ser feito manualmente para cada caso
    return content;
};

console.log('Conversão de testes iniciada...');
console.log('Nota: Este script faz conversões básicas.');
console.log('Conversões complexas precisam ser feitas manualmente.\n');

testFiles.forEach(file => {
    const filePath = path.join(testsDir, file);

    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Aplicar conversões
        content = convertSimpleDeletes(content);

        // Salvar
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Processado: ${file}`);
    } else {
        console.log(`✗ Não encontrado: ${file}`);
    }
});

console.log('\nConversão concluída!');
console.log('Revise os arquivos e complete as conversões manualmente onde necessário.');
