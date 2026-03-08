# Edge Cases Checklist

Bu doküman, geofence-case sisteminde Step 1–3 boyunca oluşabilecek kritik edge case senaryolarını ve beklenen davranışları tanımlar.

Kapsam:
- Geofence Service
- Location Service
- Logging Service
- Sistem seviyesi akışlar

Amaç:
- mevcut implementasyonun davranışını doğrulamak
- mimari açıkları erken yakalamak
- sonraki reliability hardening adımları için backlog üretmek

---

## 1. Geofence Service Edge Cases

### GEOFENCE-001 — Empty name
**Scenario:** `POST /areas` request with empty `name`  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-002 — Name longer than max length
**Scenario:** `name` length > 120  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-003 — Invalid latitude
**Scenario:** `centerLat < -90` or `centerLat > 90`  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-004 — Invalid longitude
**Scenario:** `centerLon < -180` or `centerLon > 180`  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-005 — Radius zero or negative
**Scenario:** `radiusM <= 0`  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-006 — Extremely large radius
**Scenario:** `radiusM` beyond allowed business limit  
**Expected:** `400 VALIDATION_ERROR`

### GEOFENCE-007 — Duplicate area names
**Scenario:** same `name` submitted multiple times  
**Expected:** accepted unless uniqueness is explicitly required

### GEOFENCE-008 — Health check with empty table
**Scenario:** `GET /health` when `geofence.areas` has zero rows  
**Expected:** service reports healthy if DB query succeeds

### GEOFENCE-009 — Polygon persistence verification
**Scenario:** create area successfully  
**Expected:** row exists in `geofence.areas` with real `geometry(Polygon,4326)` value and GIST index remains present

---

## 2. Location Service Edge Cases

### LOCATION-001 — Valid first enter
**Scenario:** user location is inside one known area, no prior state  
**Expected:** `enteredAreaIds` contains that area, state row inserted, Kafka event published

### LOCATION-002 — Duplicate enter
**Scenario:** same user sends same inside location again with newer timestamp  
**Expected:** no duplicate ENTER, no new inside row duplication, no duplicate transition event

### LOCATION-003 — Exit after enter
**Scenario:** user previously inside, then sends location outside all areas  
**Expected:** `exitedAreaIds` contains the old area, state row removed, EXIT event published

### LOCATION-004 — Stale event rejection
**Scenario:** older timestamp arrives after newer state already persisted  
**Expected:** request ignored, no transition computed, no state mutation, no Kafka event

### LOCATION-005 — Same timestamp replay
**Scenario:** same user sends equivalent request with same timestamp  
**Expected:** deterministic behavior, no duplicate transition event

### LOCATION-006 — Concurrent first enter
**Scenario:** two concurrent requests for same user, both inside same area, no existing state rows  
**Expected:** only one ENTER event effectively emitted, no duplicate state rows

### LOCATION-007 — Concurrent conflicting transitions
**Scenario:** same user receives concurrent inside and outside requests  
**Expected:** final state consistent with locking + timestamp rules, no duplicate contradictory events

### LOCATION-008 — Boundary point
**Scenario:** location falls exactly on geofence boundary  
**Expected:** treated as inside

### LOCATION-009 — Overlapping areas
**Scenario:** point falls inside multiple areas  
**Expected:** all containing area ids returned, entered/exited sets calculated across the full set

### LOCATION-010 — No matching area
**Scenario:** point outside every area  
**Expected:** no enter transitions, possible exits if prior state existed

### LOCATION-011 — Invalid coordinates
**Scenario:** invalid lat/lon  
**Expected:** `400 VALIDATION_ERROR`

### LOCATION-012 — Invalid timestamp format
**Scenario:** malformed ISO timestamp  
**Expected:** `400 VALIDATION_ERROR`

### LOCATION-013 — Kafka failure after DB commit
**Scenario:** state persisted successfully, Kafka publish fails  
**Expected:** request returns `INTERNAL_ERROR`; persisted state remains; no fake atomicity assumed

### LOCATION-014 — Health check with empty state table
**Scenario:** `GET /health` when `location.user_area_state` has zero rows  
**Expected:** healthy if DB readiness query succeeds

### LOCATION-015 — Phantom stale replay on empty state
**Scenario:** user enters area (T1), exits all areas (T2), then sends stale inside event (T0 < T1 < T2)  
**Expected:** Event is rejected based on `user_processing_watermarks`, returning no transitions instead of a fresh ENTER.

### LOCATION-016 — Exact timestamp duplicate replay
**Scenario:** user sends an event with the exact same millisecond timestamp as they previously sent, which is identical to the current user processing watermark  
**Expected:** Event is rejected because watermark `>= timestamp` and `maxUpdatedAt >= timestamp` checks block strictly identical times, preventing phantom exits if underlying geofences changed between the time the first packet and the retry were processed.

---

## 3. Logging Service Edge Cases

### LOGGING-001 — Valid ENTER event
**Scenario:** valid `UserEnteredArea` event consumed from Kafka  
**Expected:** row inserted into `logging.area_transition_logs`

### LOGGING-002 — Valid EXIT event
**Scenario:** valid `UserExitedArea` event consumed from Kafka  
**Expected:** row inserted into `logging.area_transition_logs`

### LOGGING-003 — Duplicate event replay
**Scenario:** same `eventId` delivered twice  
**Expected:** second delivery treated as safe no-op, no duplicate row

### LOGGING-004 — Invalid payload
**Scenario:** Kafka message missing required fields  
**Expected:** skipped, not persisted, consumer continues

### LOGGING-005 — Unsupported event type
**Scenario:** unknown event type received  
**Expected:** skipped or treated as invalid, not persisted, consumer continues

### LOGGING-006 — DB failure during insert
**Scenario:** DB unavailable or insert fails unexpectedly  
**Expected:** processing treated as failure, success must not be acknowledged prematurely

### LOGGING-007 — Out-of-order events
**Scenario:** EXIT arrives before ENTER for same user/area  
**Expected:** both valid events may still be persisted independently, append-only read model remains correct

### LOGGING-008 — Health check with empty log table
**Scenario:** `GET /health` when no logs exist yet  
**Expected:** healthy if DB query succeeds

### LOGGING-009 — GET /logs ordering
**Scenario:** multiple persisted events  
**Expected:** response ordering matches the documented rule consistently

---

## 4. System-Level Edge Cases

### SYSTEM-001 — Geofence → Location → Kafka → Logging happy path
**Scenario:** create area, send inside location, consume event  
**Expected:** area exists, transition published, log persisted

### SYSTEM-002 — Logging Service temporarily down
**Scenario:** Location publishes while Logging Service is offline  
**Expected:** once consumer resumes, Kafka-delivered messages can still be processed depending on broker retention/offset position

### SYSTEM-003 — Kafka restart
**Scenario:** broker restarts while services are running  
**Expected:** services recover according to current lifecycle and retry behavior; any limitations should be documented

### SYSTEM-004 — Postgres restart
**Scenario:** DB restarts  
**Expected:** health endpoints should fail during outage and recover after reconnection if supported

### SYSTEM-005 — Service restart with persisted state
**Scenario:** restart Location or Logging Service after normal traffic  
**Expected:** persisted DB state remains authoritative; no in-memory dependency required for correctness

---

## 5. Negative / Misconfiguration Cases

### NEGATIVE-001 — Invalid DATABASE_URL
**Expected:** service fails fast at startup

### NEGATIVE-002 — Invalid Kafka broker config
**Expected:** Logging/Location service fails fast or surfaces startup error according to current design

### NEGATIVE-003 — Missing Kafka topic
**Expected:** clear startup/runtime failure behavior, not silent success

### NEGATIVE-004 — Migration not applied
**Expected:** health or service startup should fail clearly rather than running against missing tables

---

## 6. Priority Execution Order

Önce test edilmesi önerilenler:

1. `LOCATION-006` — Concurrent first enter
2. `LOCATION-004` — Stale event rejection
3. `LOCATION-008` — Boundary point
4. `LOGGING-003` — Duplicate event replay
5. `LOCATION-013` — Kafka failure after DB commit
6. `LOGGING-004` — Invalid payload
7. `LOCATION-009` — Overlapping areas
8. `SYSTEM-001` — Full happy path

---

## 7. Result Tracking Template

Aşağıdaki şablon manuel takip için kullanılabilir:

| ID | Status | Notes |
|----|--------|-------|
| GEOFENCE-001 | TODO | |
| GEOFENCE-002 | TODO | |
| LOCATION-001 | TODO | |
| LOCATION-004 | TODO | |
| LOCATION-006 | TODO | |
| LOGGING-003 | TODO | |
| SYSTEM-001 | TODO | |

Status önerileri:
- TODO
- PASS
- FAIL
- BLOCKED