# PwC Connected Plant: the web app, the plantdb MCP server and the live-agent relay in one service.
# Build context: repository root.
#   docker build -f mcp/Dockerfile -t pwc-plant .
#   docker run -p 8787:8787 pwc-plant   ->  app at http://localhost:8787/, MCP at /mcp, chat at /api/chat
FROM node:20-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY mcp/package.json mcp/package-lock.json ./mcp/
RUN cd mcp && npm ci --omit=dev && npm cache clean --force
COPY web/package.json ./web/package.json
COPY web/src/shared ./web/src/shared
COPY --from=web /src/web/dist ./web/dist
COPY mcp/server.mjs mcp/agent.mjs mcp/bruce.mjs ./mcp/
ENV NODE_ENV=production
EXPOSE 8787
USER node
CMD ["node", "mcp/server.mjs", "--http", "8787"]
