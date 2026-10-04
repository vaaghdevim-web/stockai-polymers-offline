import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:18080/api/v1';
const USERNAME = __ENV.K6_USERNAME || 'operator01';
const PASSWORD = __ENV.K6_PASSWORD || 'operator123';

const telemetryReqDuration = new Trend('telemetry_req_duration_ms');
const activeMachinesDuration = new Trend('active_machines_req_duration_ms');
const successfulTelemetryCount = new Counter('successful_telemetry_count');

export const options = {
    scenarios: {
        telemetry_burst_scenario: {
            executor: 'ramping-arrival-rate',
            startRate: 50,
            timeUnit: '1s',
            preAllocatedVUs: 100,
            maxVUs: 500,
            stages: [
                { duration: '30s', target: 100 },
                { duration: '30s', target: 200 },
                { duration: '30s', target: 400 },
                { duration: '30s', target: 600 },
                { duration: '15s', target: 0 }
            ]
        },

        redis_cache_read_scenario: {
            executor: 'constant-arrival-rate',
            rate: 200,
            timeUnit: '1s',
            duration: '2m15s',
            preAllocatedVUs: 50,
            maxVUs: 150,
            exec: 'cacheRead'
        }
    },

    thresholds: {
        http_req_duration: [
            'p(95)<50',
            'p(99)<100'
        ],

        http_req_failed: [
            'rate<0.01'
        ],

        telemetry_req_duration_ms: [
            'p(95)<30',
            'avg<15'
        ],

        active_machines_req_duration_ms: [
            'p(95)<25',
            'avg<15'
        ]
    }
};

function login() {
    const response = http.post(
        BASE_URL + '/auth/login',
        JSON.stringify({
            usernameOrEmail: USERNAME,
            password: PASSWORD
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            tags: {
                name: 'POST_Login'
            }
        }
    );

    const loginSuccess = check(response, {
        'login status is 200': function (r) {
            return r.status === 200;
        },

        'login returned token': function (r) {
            try {
                return !!r.json('token');
            } catch (_) {
                return false;
            }
        }
    });

    if (!loginSuccess) {
        throw new Error(
            'Login failed. HTTP status: ' + response.status
        );
    }

    return response.json('token');
}

export function setup() {
    const token = login();

    return {
        token: token
    };
}

function buildTelemetryPayload() {
    return {
        machineCode: 'MACHINE-001',
        machineStatus: 'RUNNING',
        packetTimestamp: new Date().toISOString(),
        temperature: 72.5,
        pressure: 101.3,
        speed: 1450,
        vibration: 2.4,
        energyConsumption: 18.7
    };
}

export default function (data) {
    const authHeaders = {
        Authorization: 'Bearer ' + data.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };

    const telemetryResponse = http.post(
        BASE_URL + '/iot/telemetry/packet',
        JSON.stringify(buildTelemetryPayload()),
        {
            headers: authHeaders,
            tags: {
                name: 'POST_Telemetry'
            }
        }
    );

    telemetryReqDuration.add(
        telemetryResponse.timings.duration
    );

    const telemetrySuccess = check(telemetryResponse, {
        'telemetry status is 200 or 202': function (r) {
            return r.status === 200 || r.status === 202;
        },

        'telemetry response is valid': function (r) {
            try {
                const status = r.json('status');

                return (
                    status === 'ACCEPTED' ||
                    status === 'ANOMALIES_DETECTED'
                );
            } catch (_) {
                return false;
            }
        }
    });

    if (telemetrySuccess) {
        successfulTelemetryCount.add(1);
    }

    if (Math.random() < 0.2) {
        readActiveMachines(authHeaders);
    }
}

export function cacheRead(data) {
    const authHeaders = {
        Authorization: 'Bearer ' + data.token,
        Accept: 'application/json'
    };

    readActiveMachines(authHeaders);
}

function readActiveMachines(authHeaders) {
    const cacheResponse = http.get(
        BASE_URL + '/machines/active',
        {
            headers: authHeaders,
            tags: {
                name: 'GET_Active_Machines_Cache'
            }
        }
    );

    activeMachinesDuration.add(
        cacheResponse.timings.duration
    );

    check(cacheResponse, {
        'active machines status is 200': function (r) {
            return r.status === 200;
        },

        'active machines response contains machineCode': function (r) {
            return (
                r.body &&
                r.body.includes('machineCode')
            );
        }
    });
}

