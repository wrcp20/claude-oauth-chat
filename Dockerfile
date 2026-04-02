FROM node:20-slim

# Instalar claude CLI globalmente
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Dependencias primero (capa cacheada)
COPY package*.json ./
RUN npm install --production

# Código de la app
COPY server.js ./
COPY public/ ./public/

EXPOSE 3200

CMD ["node", "server.js"]
