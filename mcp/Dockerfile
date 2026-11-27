# plantdb MCP server. Build context: repository root.
#   docker build -f mcp/Dockerfile -t plantdb-mcp .
#   docker run -p 8787:8787 plantdb-mcp   ->  http://localhost:8787/mcp
FROM node:20-alpine
WORKDIR /app
COPY mcp/package.json mcp/package-lock.json ./mcp/
RUN cd mcp && npm ci --omit=dev && npm cache clean --force
COPY web/package.json ./web/package.json
COPY web/src/shared ./web/src/shared
COPY mcp/server.mjs mcp/agent.mjs mcp/bruce.mjs ./mcp/
ENV NODE_ENV=production
EXPOSE 8787
USER node
CMD ["node", "mcp/server.mjs", "--http", "8787"]
