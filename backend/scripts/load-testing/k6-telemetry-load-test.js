import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const telemetryReqDuration = new Trend('telemetry_req_duration_ms');
const activeMachinesDuration = new Trend('active_machines_req_duration_ms');
const errorRate = new Rate('error_rate');
const successfulTelemetryCount = new Counter('successful_telemetry_count');

// Load Test Stages: Ramp up to 1,000 req/sec telemetry burst rate
export const options = {
    scenarios: {
        telemetry_burst_scenario: {
            executor: 'ramping-arrival-rate',
            startRate: 50,
            timeUnit: '1s',
            preAllocatedVUs: 100,
            maxVUs: 500,
            stages: [
                { target: 200, duration: '30s' },   // Warm-up ramp
                { target: 1000, duration: '1m' },   // Sustained 1,000 req/sec burst
                { target: 1200, duration: '30s' },  // Peak spike to 1,200 req/sec
                { target: 0, duration: '15s' },     // Graceful ramp-down
            ],
        },
        redis_cache_read_scenario: {
            executor: 'constant-arrival-rate',
            rate: 200,
            timeUnit: '1s',
            duration: '2m15s',
            preAllocatedVUs: 50,
            maxVUs: 150,
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<50', 'p(99)<100'],       // 95% of requests must complete within 50ms
        'telemetry_req_duration_ms': ['p(95)<30', 'avg<15'],  // Telemetry endpoint p95 < 30ms, avg < 15ms
        'active_machines_req_duration_ms': ['p(95)<10', 'avg<5'], // Sub-millisecond to 5ms cached machine lookup
        'error_rate': ['rate<0.01'],                          // Error rate must be less than 1% (99% success SLA)
    },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080/api/v1';

const SENSOR_NODES = [
    { machineCode: 'MCH-EXT-01', unit: 'Unit 1', machineType: 'Extruder' },
    { machineCode: 'MCH-EXT-02', unit: 'Unit 1', machineType: 'Extruder' },
    { machineCode: 'MCH-WEAV-01', unit: 'Unit 2', machineType: 'Loom' },
    { machineCode: 'MCH-WEAV-02', unit: 'Unit 2', machineType: 'Loom' },
    { machineCode: 'MCH-CONV-01', unit: 'Unit 3', machineType: 'BCS' },
    { machineCode: 'MCH-CONV-02', unit: 'Unit 3', machineType: 'BCS' },
];

function getRandomSensor() {
    return SENSOR_NODES[Math.floor(Math.random() * SENSOR_NODES.length)];
}

function getRandomFloat(min, max, decimals = 2) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
}

export default function () {
    const sensor = getRandomSensor();
    const timestamp = new Date().toISOString();

    // 1. Send High-Throughput Telemetry Ingestion Packet (POST /api/v1/iot/telemetry/packet)
    const telemetryPayload = JSON.stringify({
        machineCode: sensor.machineCode,
        plantId: 1,
        unit: sensor.unit,
        machineType: sensor.machineType,
        zone1Temp: getRandomFloat(185.0, 245.0),
        zone2Temp: getRandomFloat(190.0, 250.0),
        meltPressureBar: getRandomFloat(120.0, 185.0),
        screwRpm: getRandomFloat(75.0, 110.0),
        lineSpeedMpm: getRandomFloat(280.0, 420.0),
        machineStatus: 'RUNNING',
        packetTimestamp: timestamp
    });

    const telemetryParams = {
        headers: {
            'Content-Type': 'application/json',
            'X-Telemetry-Source': 'k6-load-burst-generator',
        },
        tags: { name: 'POST_Telemetry_Packet' },
    };

    const telemetryRes = http.post(`${BASE_URL}/iot/telemetry/packet`, telemetryPayload, telemetryParams);
    
    telemetryReqDuration.add(telemetryRes.timings.duration);
    const telemetrySuccess = check(telemetryRes, {
        'telemetry status is 200 or 202': (r) => r.status === 200 || r.status === 202,
        'telemetry response contains status ACCEPTED': (r) => r.body && r.body.includes('ACCEPTED'),
    });

    if (telemetrySuccess) {
        successfulTelemetryCount.add(1);
        errorRate.add(0);
    } else {
        errorRate.add(1);
    }

    // 2. Query Sub-Millisecond Active Machine Cache (GET /api/v1/machines/active)
    if (Math.random() < 0.2) { // 20% sample rate for cache validation under load
        const cacheParams = {
            headers: { 'Accept': 'application/json' },
            tags: { name: 'GET_Active_Machines_Cache' },
        };
        const cacheRes = http.get(`${BASE_URL}/machines/active`, cacheParams);
        activeMachinesDuration.add(cacheRes.timings.duration);

        const cacheSuccess = check(cacheRes, {
            'cache status is 200': (r) => r.status === 200,
            'cache response contains machineCode': (r) => r.body && r.body.includes('machineCode'),
        });

        if (!cacheSuccess) {
            errorRate.add(1);
        }
    }
}
