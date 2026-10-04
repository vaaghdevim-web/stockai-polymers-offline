# ============================================================
# Frontend build
# ============================================================

FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

RUN npm run lint
RUN npm run build


# ============================================================
# Backend build
# ============================================================

FROM eclipse-temurin:21-jdk-alpine AS backend-builder

WORKDIR /workspace

RUN apk add --no-cache bash

COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./

RUN chmod +x ./mvnw

RUN ./mvnw dependency:go-offline -B || true

COPY backend/src src

# Copy the production React build into Spring Boot static resources.
COPY --from=frontend-builder /frontend/dist /workspace/src/main/resources/static

RUN ./mvnw clean package -DskipTests


# ============================================================
# Production runtime
# ============================================================

FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -g 10001 -S stockai && \
    adduser -u 10001 -S stockai -G stockai

RUN mkdir -p /app/storage /app/logs && \
    chown -R stockai:stockai /app

COPY --from=backend-builder --chown=stockai:stockai \
    /workspace/target/stockai-*.jar /app/app.jar

ENV PORT=8080 \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health | \
    grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]