# Case Control Guide

Bu doküman, verilen teknik case'in gereksinimlerine karşılık mevcut çözümün gerçekten doğru çalıştığını doğrulamak için hazırlanmıştır.

Kapsam:
- Geofence Service
- Location Service
- Logging Service
- Outbox flow
- Kafka flow
- DB verification
- reliability / concurrency / stale handling

Amaç:
- çözümün case gereksinimlerini karşıladığını göstermek
- mimari kararların doğruluğunu test etmek
- final teslim öncesi kontrol listesi sunmak

---

# 1. Case Gereksinimleri

Case'te istenen endpointler:

- `POST /locations`
- `GET /logs`
- `POST /areas`
- `GET /areas`

Case'te istenen davranışlar:

- kullanıcının gönderdiği konumun önceden tanımlı alanlarla karşılaştırılması
- kullanıcı belirli bir alanın içine girdiğinde olayın loglanması
- logların kullanıcı ID, alan ID ve zaman bilgisi içermesi
- sistemin yük altında ve eşzamanlı isteklerde güvenli çalışması

---

# 2. Mevcut Sistem Eşlemesi

## 2.1 Geofence Service
Sorumluluklar:
- `POST /areas`
- `GET /areas`
- PostGIS üzerinde geofence polygon saklama
- spatial index ile geospatial veriyi yönetme

## 2.2 Location Service
Sorumluluklar:
- `POST /locations`
- PostGIS ile containment kontrolü
- entered/exited transition hesaplama
- aynı kullanıcı için concurrency kontrolü
- stale event rejection
- outbox tablosuna event intent yazma

## 2.3 Logging Service
Sorumluluklar:
- Kafka transition eventlerini consume etme
- append-only log persistence
- duplicate eventleri idempotent şekilde ignore etme
- `GET /logs`

---

# 3. Gereksinim Bazlı Kabul Kriterleri

## 3.1 `POST /areas`
Beklenen:
- validation çalışmalı
- polygon DB'de gerçek geometry olarak saklanmalı
- response `id`, `name`, `createdAt` dönmeli

## 3.2 `GET /areas`
Beklenen:
- kayıtlı alanlar listelenmeli
- minimal alanlar dönmeli

## 3.3 `POST /locations`
Beklenen:
- geçerli location ingest edilmeli
- containment PostGIS ile hesaplanmalı
- enter/exit transition doğru hesaplanmalı
- duplicate transition oluşmamalı
- stale event işlenmemeli
- outbox row oluşmalı
- request path direkt Kafka publish yapmamalı

## 3.4 `GET /logs`
Beklenen:
- persisted transition logları dönmeli
- loglarda en az şu alanlar olmalı:
  - `eventId`
  - `userId`
  - `areaId`
  - `eventType`
  - `occurredAt`
  - `receivedAt`

---

# 4. Reliability Kriterleri

## 4.1 Concurrency
Beklenen:
- same-user concurrent requestlerde duplicate enter/exit oluşmamalı
- advisory lock ile per-user correctness korunmalı

## 4.2 Stale Event Handling
Beklenen:
- eski event yeni state'i ezmemeli
- watermark / timestamp kontrolü ile phantom enter engellenmeli

## 4.3 Outbox
Beklenen:
- state mutation ve outbox insert aynı transaction içinde olmalı
- DB commit sonrası event intent kaybolmamalı
- outbox poller pending rowları publish etmeli
- publish başarılıysa row `published` olmalı
- publish fail olursa row retryable kalmalı

## 4.4 Logging Idempotency
Beklenen:
- aynı `eventId` ikinci kez yazılmamalı
- `UNIQUE(event_id)` ile duplicate delivery no-op olmalı

---

# 5. DB Doğrulama Noktaları

## Geofence
- `geofence.areas`
- `geom geometry(Polygon,4326)`
- spatial index mevcut mu

## Location
- `location.user_area_state`
- `location.user_processing_watermarks`
- `location.outbox_events`

## Logging
- `logging.area_transition_logs`

---

# 6. Kafka Doğrulama Noktaları

Topic:
- `area-transitions`

Beklenen:
- key = `userId`
- payload contract bozulmamalı
- Logging Service eventleri consume edebilmeli

---

# 7. Sonuç Beklentisi

Bu case başarıyla tamamlanmış sayılabilmesi için:

- endpointler çalışmalı
- state transitions doğru olmalı
- stale replay bug engellenmiş olmalı
- duplicate log oluşmamalı
- outbox reliability akışı çalışmalı
- clean architecture korunmuş olmalı