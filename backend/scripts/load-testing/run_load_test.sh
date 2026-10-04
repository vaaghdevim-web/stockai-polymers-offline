#!/bin/bash
# Shell Runner for Telemetry Burst Rate Load Testing (1,000 req/sec)

TARGET_URL="${1:-http://localhost:8080/api/v1}"
OUTPUT_FILE="${2:-load-test-results.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " StockAI Engineer 2 - 1,000 req/sec Burst Load Test Suite"
echo " Target Endpoint: $TARGET_URL"
echo "=========================================================="

if command -v k6 &> /dev/null; then
    echo "[INFO] Found k6 executable in PATH. Initiating distributed load test..."
    TARGET_URL="$TARGET_URL" k6 run --summary-export "$SCRIPT_DIR/$OUTPUT_FILE" "$SCRIPT_DIR/k6-telemetry-load-test.js"
else
    echo "[WARN] k6 executable is not installed in PATH."
    echo "[INFO] Running native in-process JUnit multi-threaded load benchmark suite instead..."
    cd "$SCRIPT_DIR/../.."
    ./mvnw test -Dtest=TelemetryBurstRateLoadTest -Dmaven.compiler.release=23
fi
