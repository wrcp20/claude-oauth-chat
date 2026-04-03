FROM node:20-slim

# Instalar claude CLI globalmente
RUN npm install -g @anthropic-ai/claude-code

# Crear usuario no-root (--dangerously-skip-permissions falla con root)
RUN useradd -m -u 1001 claude

WORKDIR /app

# Dependencias primero (capa cacheada)
COPY package*.json ./
RUN npm install --production

# Código de la app
COPY server.js ./

# Directorio de credenciales con permisos para el usuario claude
RUN mkdir -p /home/claude/.claude && chown -R claude:claude /app /home/claude

USER claude

EXPOSE 3200

CMD ["node", "server.js"]
