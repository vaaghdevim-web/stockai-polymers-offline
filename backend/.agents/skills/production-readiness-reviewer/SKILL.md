---
name: production-readiness-reviewer
description: Assess operational readiness of services before production launch. Covers observability, alerting, runbooks, capacity, and on-call preparedness beyond just "code works." Use before launching new services or major features to ensure they are supportable in production.
category: Software Development
tags:
  - production-readiness
  - PRR
  - operability
  - observability
  - alerting
  - runbooks
  - launch
  - SRE
  - DevOps
---

# Production Readiness Reviewer

## Overview

Code that passes tests is not production-ready. Production-ready means a service can be operated, monitored, debugged, and recovered by the on-call team at 3 AM. This skill provides the assessment framework for operational readiness—the gap between "it works" and "we can run it."

## The Production Readiness Gap

```
WHAT MOST TEAMS CHECK           WHAT PRODUCTION ACTUALLY NEEDS
─────────────────────           ──────────────────────────────
□ Tests pass                    □ Can we tell when it's broken?
□ Code reviewed                 □ Can we understand WHY it's broken?
□ Feature complete              □ Can we fix it at 3 AM?
□ Deployed successfully         □ Can we recover if it fails catastrophically?
□ PM signed off                 □ Will it stay up under real load?
                                □ Do operators know it exists?
```

## Production Readiness Review (PRR) Framework

### When to Conduct PRR

| Trigger | PRR Depth |
|---------|-----------|
| New service/system | Full PRR |
| Major feature (new dependencies, new failure modes) | Focused PRR |
| Significant architecture change | Focused PRR |
| Moving to new infrastructure | Full PRR |
| Post-incident (found operability gaps) | Gap-focused PRR |

### PRR Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│               PRODUCTION READINESS DIMENSIONS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. OBSERVABILITY        2. ALERTING         3. RUNBOOKS       │
│     Can we see it?          Will we know?       Can we act?    │
│                                                                 │
│  4. CAPACITY             5. RESILIENCE       6. ON-CALL        │
│     Will it scale?          Will it recover?    Are humans ready?│
│                                                                 │
│  7. DEPENDENCIES         8. SECURITY         9. DOCUMENTATION  │
│     What can break us?      Is it hardened?     Can others help?│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Dimension 1: Observability

### Logging Checklist

| Requirement | Check | Notes |
|-------------|-------|-------|
| Structured logging (JSON) | □ | Enables parsing and querying |
| Request ID / correlation ID | □ | Trace requests across services |
| User/tenant ID in logs | □ | Debug customer-specific issues |
| Error logs include stack trace | □ | Debuggability |
| PII scrubbed from logs | □ | Compliance |
| Log levels appropriate | □ | Not everything is ERROR |
| Logs shipped to central system | □ | Accessible during incidents |
| Log retention configured | □ | Can investigate past issues |

### Metrics Checklist

| Metric Type | Examples | Check |
|-------------|----------|-------|
| **Request metrics** | Rate, latency (p50/p95/p99), error rate | □ |
| **Resource metrics** | CPU, memory, disk, connections | □ |
| **Business metrics** | Orders/sec, signups, key actions | □ |
| **Dependency metrics** | Latency/errors to downstream services | □ |
| **Queue metrics** | Depth, age, processing rate | □ |
| **Custom health** | Service-specific indicators | □ |

### The Four Golden Signals

```
EVERY SERVICE MUST EXPOSE:

1. LATENCY      - How long requests take (success vs error)
2. TRAFFIC      - How much demand (requests/sec, transactions)  
3. ERRORS       - Rate of failed requests
4. SATURATION   - How "full" the service is (capacity utilization)
```

### Tracing Checklist

| Requirement | Check |
|-------------|-------|
| Distributed tracing enabled | □ |
| Trace context propagated to dependencies | □ |
| Spans include meaningful names | □ |
| Error spans include details | □ |
| Sampling rate appropriate | □ |

## Dimension 2: Alerting

### Alert Quality Criteria

```
GOOD ALERT:
• Actionable (human can do something)
• Accurate (low false positive rate)
• Relevant (indicates real user impact)
• Clear (what's wrong, what to do)
• Prioritized (severity matches impact)

BAD ALERT:
• "CPU is high" (so what?)
• Fires constantly (alert fatigue)
• No runbook link
• Unclear severity
• No context for on-call
```

### Required Alerts (Minimum)

| Alert | Threshold Guidance | Severity |
|-------|-------------------|----------|
| Service down / health check failing | Any failure | SEV1/P1 |
| Error rate elevated | >1% (adjust for baseline) | SEV2/P2 |
| Latency elevated (p99) | >2x baseline | SEV2/P2 |
| Resource exhaustion imminent | >80% utilization | SEV2/P2 |
| Queue backing up | >X minutes old | SEV2/P3 |
| Dependency failing | Error rate or timeout | SEV2/P2 |
| Certificate expiring | <14 days | SEV3/P3 |
| Disk filling | >80% | SEV2/P2 |

### Alert Hygiene

| Check | Requirement |
|-------|-------------|
| □ | Every alert has an owner |
| □ | Every alert has a runbook link |
| □ | Alert thresholds reviewed quarterly |
| □ | False positives tracked and addressed |
| □ | Paging vs. non-paging alerts distinguished |
| □ | Alert routing tested |

## Dimension 3: Runbooks

### Runbook Requirements

Every service needs runbooks for:

| Scenario | Runbook Contents |
|----------|------------------|
| **Service won't start** | Dependencies to check, common causes, restart procedure |
| **Service is slow** | How to diagnose, what to check, scaling options |
| **Service is erroring** | Log locations, common errors, remediation |
| **Dependency is down** | Impact, fallback behavior, escalation |
| **Need to rollback** | Rollback procedure, verification |
| **Need to scale** | How to scale, limits, approval needed |
| **Data issue** | How to investigate, who can fix, escalation |

### Runbook Quality Checklist

```
RUNBOOK QUALITY CHECK:
□ Written for someone unfamiliar with the service
□ Step-by-step (not "investigate the issue")
□ Includes expected output at each step
□ Has escalation path when steps don't work
□ Tested by someone other than author
□ Updated after every incident that revealed gaps
□ Links to relevant dashboards/logs
□ Includes rollback/recovery steps
```

### Runbook Template

```
# [Alert Name] Runbook

## What This Means
[1-2 sentences: what's broken, user impact]

## Severity
[P1/P2/P3 and why]

## First Response (< 5 minutes)
1. Check [dashboard link] for current state
2. Check [log query link] for errors
3. Verify [health endpoint] is responding

## Diagnosis
If [symptom A]:
  → Likely cause: [X]. Go to section "Fixing X"
  
If [symptom B]:
  → Likely cause: [Y]. Go to section "Fixing Y"

## Remediation

### Fixing X
1. [Step]
2. [Step]
3. Verify: [expected result]

### Fixing Y
1. [Step]
2. [Step]
3. Verify: [expected result]

## Escalation
If above doesn't resolve:
- Page [team/person]
- Slack: [channel]
- Context to provide: [what info to gather first]

## Post-Incident
- [ ] Update this runbook if anything was missing
- [ ] File bug if code change needed
```

## Dimension 4: Capacity

### Capacity Assessment

| Question | Answer Required |
|----------|-----------------|
| What's the current capacity? | X requests/sec, Y concurrent users |
| What's current utilization? | Z% of capacity |
| How much headroom? | N% / Nx current traffic |
| How do we scale? | Auto / Manual / Requires provisioning |
| What's the scaling ceiling? | Hard limits, bottlenecks |
| What breaks first under load? | DB, memory, connections, etc. |

### Load Testing Checklist

| Check | Requirement |
|-------|-------------|
| □ | Load tested at 2x expected peak |
| □ | Load tested sustained (not just spike) |
| □ | Failure mode under overload understood |
| □ | Graceful degradation verified |
| □ | Recovery after overload verified |
| □ | Dependencies included in load test |

## Dimension 5: Resilience

### Failure Mode Analysis

| Failure | Expected Behavior | Verified? |
|---------|-------------------|-----------|
| Database unavailable | Graceful error, no cascade | □ |
| Cache unavailable | Falls back to DB, slower but works | □ |
| Dependency timeout | Times out gracefully, doesn't block | □ |
| Network partition | Handles partial failure | □ |
| Disk full | Alerts before failure, graceful degradation | □ |
| Memory exhaustion | OOM handled, auto-restart | □ |
| Config error on deploy | Validation prevents bad deploy | □ |

### Rollback Capability

```
ROLLBACK CHECKLIST:
□ Can rollback within 5 minutes
□ Rollback procedure documented
□ Rollback tested (not just theoretically possible)
□ Database migrations are backward-compatible
□ Feature flags enable partial rollback
□ Rollback doesn't require heroics
```

## Dimension 6: On-Call Readiness

### Team Readiness

| Check | Requirement |
|-------|-------------|
| □ | On-call rotation includes this service |
| □ | On-call has access to all needed systems |
| □ | On-call has been trained on this service |
| □ | On-call has shadowed an incident (if new service) |
| □ | Escalation path defined and known |
| □ | Backup on-call identified |

## Dimension 7: Dependencies

### Dependency Mapping

| Dependency | Type | Failure Impact | Mitigation |
|------------|------|----------------|------------|
| PostgreSQL | Critical | Service down | Connection pool limits, healthchecks |
| Redis | Degraded | Token revocation / cache miss | Fallback to DB / bypass |
| Kafka | Degraded | Telemetry queued locally | Buffering, dead-letter |
| MinIO / S3 | Critical | Document store unavailable | Retry with backoff |

## Dimension 8: Security

### Security Basics for Operations

| Check | Requirement |
|-------|-------------|
| □ | Secrets not in code or logs |
| □ | Secrets rotatable without deploy |
| □ | Network access restricted appropriately |
| □ | Authentication required for admin functions |
| □ | Audit logging for sensitive operations |
| □ | Security alerts configured |
| □ | Incident response plan includes security |

## Dimension 9: Documentation

| Document | Audience | Check |
|----------|----------|-------|
| Architecture diagram | All | □ |
| Service overview | On-call | □ |
| Runbooks | On-call | □ |
| API documentation | Consumers | □ |
| Data flow diagram | Security, compliance | □ |
| Dependency map | On-call, architects | □ |

## PRR Scorecard

```
PRODUCTION READINESS SCORECARD
──────────────────────────────
Service: StockAI / PP Woven Bag Manufacturing IMS
Date: 2026-09-15
Reviewer: Senior Security & Production-Readiness Engineer

DIMENSION                    SCORE (1-5)    BLOCKER?
───────────────────────────────────────────────────
Observability               [   ]          □
Alerting                    [   ]          □
Runbooks                    [   ]          □
Capacity                    [   ]          □
Resilience                  [   ]          □
On-call Readiness           [   ]          □
Dependencies                [   ]          □
Security                    [   ]          □
Documentation               [   ]          □
```
