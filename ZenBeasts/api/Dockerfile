# ============================================================================
# ZenBeasts API - Dockerfile
# Backend API service with Node.js/Express
# ============================================================================

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps || yarn install --production --frozen-lockfile

# Copy application source
COPY . .

# Build TypeScript if applicable
RUN if [ -f "tsconfig.json" ]; then npm run build || true; fi

# ============================================================================
# Runtime stage
# ============================================================================
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini

# Create non-root user
RUN addgroup -g 1001 -S apiuser && \
    adduser -S apiuser -u 1001

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --from=builder --chown=apiuser:apiuser /app/package*.json ./
COPY --from=builder --chown=apiuser:apiuser /app/dist ./dist
COPY --from=builder --chown=apiuser:apiuser /app/src ./src

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/data && \
    chown -R apiuser:apiuser /app

# Switch to non-root user
USER apiuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "src/index.js"]

# ============================================================================
# Alternative commands:
# For TypeScript: CMD ["node", "dist/index.js"]
# For development: CMD ["npm", "run", "dev"]
# ============================================================================

# ============================================================================
# Build instructions:
# docker build -t zenbeasts-api:latest .
#
# Run instructions:
# docker run -d \
#   --name zenbeasts-api \
#   -p 8080:8080 \
#   --env-file .env \
#   -v $(pwd)/logs:/app/logs \
#   zenbeasts-api:latest
#
# Development mode:
# docker run -it --rm \
#   -v $(pwd):/app \
#   -v /app/node_modules \
#   -p 8080:8080 \
#   --env-file .env \
#   zenbeasts-api:latest \
#   npm run dev
#
# Connect to database:
# docker run -d \
#   --name zenbeasts-api \
#   --network zenbeasts-network \
#   -e DATABASE_URL=postgresql://user:pass@postgres:5432/zenbeasts \
#   -e REDIS_URL=redis://redis:6379 \
#   zenbeasts-api:latest
# ============================================================================
