# ============================================================================
# ZenBeasts Bot Hub - Dockerfile
# Multi-stage build for optimized production image
# ============================================================================

# Build stage
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================================================
# Runtime stage
# ============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH=/root/.local/bin:$PATH

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Create necessary directories
RUN mkdir -p /app/data/logs \
    /app/data/cache \
    /app/data/reports \
    /app/config \
    /app/backups

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 botuser && \
    chown -R botuser:botuser /app

# Switch to non-root user
USER botuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import sys; sys.exit(0)" || exit 1

# Expose ports
EXPOSE 5000 9090

# Default command
CMD ["python", "orchestrator.py", "start"]

# ============================================================================
# Build instructions:
# docker build -t zenbeasts-bot-hub:latest .
#
# Run instructions:
# docker run -d \
#   --name zenbeasts-bot-hub \
#   --env-file .env \
#   -p 5000:5000 \
#   -p 9090:9090 \
#   -v $(pwd)/data:/app/data \
#   -v $(pwd)/config:/app/config \
#   zenbeasts-bot-hub:latest
#
# Development mode:
# docker run -it --rm \
#   --env-file .env \
#   -v $(pwd):/app \
#   zenbeasts-bot-hub:latest \
#   /bin/bash
# ============================================================================
