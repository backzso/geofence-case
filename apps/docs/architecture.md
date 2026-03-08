# Architecture Overview

Bu doküman sistemin yüksek seviyeli mimarisini özetler.

---

# 1. Services

## Geofence Service
- geofence alanlarını oluşturur
- polygonları PostGIS üzerinde saklar
- `POST /areas`
- `GET /areas`

## Location Service
- kullanıcı konumlarını alır
- PostGIS containment yapar
- current inside-state’i yönetir
- stale event rejection uygular
- outbox eventleri üretir

## Logging Service
- Kafka transition eventlerini consume eder
- append-only log yazar
- `GET /logs`

---

# 2. Data Ownership

## geofence schema
- `geofence.areas`

## location schema
- `location.user_area_state`
- `location.user_processing_watermarks`
- `location.outbox_events`

## logging schema
- `logging.area_transition_logs`

---

# 3. Main Flow

1. Geofence Service alan oluşturur
2. Location Service `POST /locations` alır
3. PostGIS ile current containing area set hesaplanır
4. previous inside set ile current inside set karşılaştırılır
5. entered/exited setleri çıkarılır
6. current state mutation + outbox insert aynı transaction içinde yapılır
7. outbox poller Kafka'ya publish eder
8. Logging Service eventleri consume eder
9. append-only log persistence yapılır

---

# 4. Reliability Decisions

- same-user concurrency için advisory lock
- stale replay bug için user watermark
- dual write gap için outbox
- duplicate log için UNIQUE(event_id)

---

# 5. Core Principle

Sistem tek alan mantığıyla değil, **alan kümesi farkı** mantığıyla çalışır.

Yani:

- `previousInsideSet`
- `currentInsideSet`

karşılaştırılır.

Bu yüzden:
- bir alandan diğerine geçiş
- overlap alanlar
- çoklu enter/exit

doğru şekilde modellenebilir.