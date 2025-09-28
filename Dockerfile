# Use Node.js oficial
FROM node:18-alpine

# Instalar dependências necessárias para compilar bcrypt
RUN apk add --no-cache make gcc g++ python3

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para bcrypt)
RUN npm ci

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]