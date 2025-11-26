# ============================================================================
# ZenBeasts Frontend - Dockerfile
# Next.js application with optimized production build
# ============================================================================

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_SOLANA_NETWORK=devnet
ARG NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
ARG NEXT_PUBLIC_API_BASE_URL=http://api:8080

ENV NEXT_PUBLIC_SOLANA_NETWORK=$NEXT_PUBLIC_SOLANA_NETWORK
ENV NEXT_PUBLIC_SOLANA_RPC_HOST=$NEXT_PUBLIC_SOLANA_RPC_HOST
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build Next.js application
RUN npm run build || yarn build

# ============================================================================
# Runtime stage
# ============================================================================
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]

# ============================================================================
# Build instructions:
# docker build -t zenbeasts-frontend:latest .
#
# Run instructions:
# docker run -d \
#   --name zenbeasts-frontend \
#   -p 3000:3000 \
#   --env-file .env \
#   zenbeasts-frontend:latest
#
# Development mode:
# docker run -it --rm \
#   -v $(pwd):/app \
#   -v /app/node_modules \
#   -p 3000:3000 \
#   zenbeasts-frontend:latest \
#   npm run dev
# ============================================================================
