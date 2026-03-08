# Final Verification Guide

Bu doküman, mevcut çalışan sistem üzerinde final doğrulama için kullanılacaktır.

Önemli:
- temiz DB varsayımı yapılmaz
- mevcut area'lar ve mevcut loglar yeniden kullanılabilir
- gereksiz seed adımları tekrarlanmaz

---

# 1. Reusable Environment Check

## Health checks
- [ ] Geofence health
- [ ] Location health
- [ ] Logging health

## Existing data reuse
- [ ] mevcut geofence alanları görülebiliyor
- [ ] mevcut logs görülebiliyor
- [ ] mevcut outbox rows incelenebiliyor

---

# 2. Core Functional Tests

## Geofence
- [ ] area create
- [ ] area list
- [ ] invalid payload rejection
- [ ] DB geometry verification

## Location
- [ ] first enter
- [ ] duplicate enter prevention
- [ ] exit transition
- [ ] stale event rejection
- [ ] same timestamp replay deterministic behavior
- [ ] area-to-area transition
- [ ] overlap transition
- [ ] no-area transition
- [ ] boundary-point behavior

## Logging
- [ ] valid ENTER persisted
- [ ] valid EXIT persisted
- [ ] duplicate event replay ignored
- [ ] invalid payload skip
- [ ] logs list ordering

---

# 3. Reliability Tests

## Concurrency
- [ ] same-user concurrent first enter
- [ ] conflicting concurrent transitions
- [ ] no duplicate log under concurrency

## Outbox
- [ ] outbox row created on transition
- [ ] request path no longer publishes directly
- [ ] outbox row eventually published
- [ ] retryable row preserved on Kafka failure
- [ ] published row finalized correctly

---

# 4. DB Verification Queries

## Geofence
```sql
SELECT id, name, created_at FROM geofence.areas;
```

## Location current state
```sql
SELECT * FROM location.user_area_state;
```

## Location watermarks
```sql
SELECT * FROM location.user_processing_watermarks;
```

## Location Outbox
```sql
SELECT id, event_id, event_type, status, attempts, available_at, published_at, created_at
FROM location.outbox_events
ORDER BY created_at DESC;
```

## Logging
```sql
SELECT * FROM logging.area_transition_logs
ORDER BY received_at DESC;
```

# 5. Resul Table

| Test | Status | Notes |
| Geofence Core | TODO | |
| LOCATION-ENTER | TODO | |
| LOCATION-DUPLICATE | TODO | |
| LOCATION-EXIT | TODO | |
| LOCATION-STALE | TODO | |
| LOCATION-CONCURRENCY | TODO | |
| LOCATION-AREA-TO-AREA | TODO | |
| LOCATION-OVERLAP | TODO | |
| LOCATION-NO-AREA | TODO | |
| LOGGING-CORE | TODO | |
| LOGGING-DUPLICATE | TODO | |
| LOGGING-CORE | TODO | |
| OUTBOX-CORE | TODO | |
| OUTBOX-CORE | TODO | |
| OUTBOX-RETRY | TODO | |
| WATERMARK-CORE | TODO | |
| SYSTEM-E2E | TODO | |
