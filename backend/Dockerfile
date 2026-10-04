# ==============================================================================
# Multi-Stage Production Dockerfile for SVP StockAI Application
# Base: Eclipse Temurin OpenJDK 23 (Alpine Linux)
# Target: Minimal attack surface, unprivileged non-root user (UID 10001)
# ==============================================================================

# Stage 1: Build & Package
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Install essential build tools
RUN apk add --no-cache bash

# Cache dependencies layer
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B || true

# Copy source code and build production artifact
COPY src src
RUN ./mvnw clean package -DskipTests "-Dmaven.compiler.release=21"

# Stage 2: Hardened Runtime Container
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Create unprivileged system group and user
RUN addgroup -g 10001 -S stockai && \
    adduser -u 10001 -S stockai -G stockai

# Create data directories with appropriate ownership
RUN mkdir -p /app/storage /app/logs && \
    chown -R stockai:stockai /app

# Copy executable jar from builder stage
COPY --from=builder --chown=stockai:stockai /workspace/target/stockai-*.jar app.jar

# Configuration and JVM memory ergonomics for containers
ENV PORT=8080 \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

# Switch to non-root user
USER 10001:10001

# Expose standard application HTTP port
EXPOSE 8080

# Health check using Spring Boot Actuator endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

# Launch application with exec to allow proper signal propagation (SIGTERM/SIGINT)
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
