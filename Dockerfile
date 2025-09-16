## Multi-stage build for OilProTanks (Cloud Run compatible)
FROM node:20-slim AS build
WORKDIR /app

# Enable corepack just in case (locks npm version if packageManager field present)
ENV NODE_ENV=development

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build step)
RUN npm ci

# Copy source
COPY . .

# Build client + server bundle
RUN npm run build

### Runtime image
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only needed runtime artifacts
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/openapi.json ./openapi.json

# Expose Cloud Run port (Cloud Run sets PORT env; default to 8080)
ENV PORT=8080
EXPOSE 8080

# Start the server (uses dist/index.js built by build step)
CMD ["npm", "run", "start"]
