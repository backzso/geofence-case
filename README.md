# Geofence Case

This repository contains a production-minded geofencing microservice system built with NestJS, TypeScript, PostgreSQL/PostGIS, Prisma, and Kafka.

The solution is designed around clean architectural boundaries, correctness under concurrency, and reliability-oriented event flow rather than a quick prototype.

It currently includes:

- Geofence Service
  - create geofence areas
  - list geofence areas
  - persist real PostGIS polygons
- Location Service
  - ingest user locations
  - evaluate geofence containment using PostGIS
  - compute enter/exit transitions
  - protect same-user processing with transactional concurrency control
  - persist event intent via Outbox Pattern
- Logging Service
  - consume transition events from Kafka
  - persist append-only logs
  - guarantee idempotent event handling via unique event IDs

--------------------------------------------------
1. Tech Stack
--------------------------------------------------

- Framework: NestJS
- Language: TypeScript
- Database: PostgreSQL
- Geospatial: PostGIS
- ORM: Prisma
- Messaging: Kafka / KafkaJS
- Local infra: Docker Compose

--------------------------------------------------
2. Repository Structure
--------------------------------------------------

root/
  apps/
    geofence-service/
    location-service/
    logging-service/
  docs/
    architecture.md
    edgecases.md
    casecontrol.md
    final-verification.md
    known-limitations.md
  infra/
    docker-compose.yml

--------------------------------------------------
3. High-Level Architecture
--------------------------------------------------

The system follows Clean Architecture / Hexagonal Architecture.

Each service is separated into conceptual layers:

src/
  domain/
  application/
  infrastructure/
  presentation/

Design principles:

- domain logic is framework-agnostic
- controllers are thin
- use cases orchestrate behavior
- repository interfaces live in application layer
- infrastructure implements persistence and messaging details
- raw SQL stays in infrastructure
- service boundaries are preserved even in the monorepo

--------------------------------------------------
4. Service Responsibilities
--------------------------------------------------

4.1 Geofence Service

Owns schema:
- geofence.*

Responsibilities:
- POST /areas
- GET /areas
- GET /health

Stores geofence areas as real PostGIS geometry polygons.

Main table:

geofence.areas
- id
- name
- geom geometry(Polygon,4326)
- created_at

The service receives circle-like input and delegates polygon creation to PostGIS:

ST_Buffer(
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
  radius_m
)::geometry

4.2 Location Service

Owns schema:
- location.*

Responsibilities:
- POST /locations
- GET /health

Behavior:
- accepts a user's location
- checks which geofences currently contain the point
- compares previous inside-state vs current inside-state
- computes:
  - enteredAreaIds
  - exitedAreaIds
- persists state transactionally
- writes event intent into the outbox table inside the same transaction
- leaves Kafka publishing to the outbox poller

Main tables:

location.user_area_state
- user_id
- area_id
- updated_at

location.user_processing_watermarks
- user_id
- last_processed_at
- updated_at

location.outbox_events
- id
- event_id
- aggregate_type
- aggregate_id
- event_type
- partition_key
- payload
- status
- attempts
- available_at
- published_at
- created_at
- updated_at

State model:
- only INSIDE rows are stored in user_area_state
- absence of a row means OUTSIDE

Reliability additions:
- user-scoped advisory lock for same-user concurrency
- user processing watermark to reject stale or replayed timestamps
- outbox pattern to remove the direct DB+Kafka dual write gap

4.3 Logging Service

Owns schema:
- logging.*

Responsibilities:
- consume Kafka transition events
- persist immutable logs
- expose GET /logs
- expose GET /health

Main table:

logging.area_transition_logs
- id
- event_id
- user_id
- area_id
- event_type
- occurred_at
- received_at

Behavior:
- append-only logging
- duplicate Kafka deliveries are ignored using UNIQUE(event_id)

--------------------------------------------------
5. Event Flow
--------------------------------------------------

The main runtime flow is:

1. A geofence is created through Geofence Service
2. A user location is posted to Location Service
3. Location Service uses PostGIS to calculate the current containing area set
4. It compares:
   - previousInsideSet
   - currentInsideSet
5. It derives:
   - enteredAreaIds = current - previous
   - exitedAreaIds  = previous - current
6. It persists:
   - current state mutation
   - outbox rows
   in the same DB transaction
7. The outbox poller publishes pending events to Kafka
8. Logging Service consumes those events
9. Logging Service persists append-only transition logs

Important:
The system does not model “A to B” as a single special transition object.
It models transitions as set differences.
So moving from one area to another is represented as:
- exit from old area
- enter into new area

This is necessary for correctness when areas overlap.

--------------------------------------------------
6. Reliability Decisions
--------------------------------------------------

6.1 Same-user concurrency

Location processing uses a user-scoped advisory lock.
This prevents duplicate ENTER / EXIT outcomes when the same user's requests arrive concurrently.

6.2 Stale replay protection

The system persists a user-level processing watermark.
This prevents stale phantom replays even when user_area_state is empty.

Rule:
For the same user, events with timestamps less than or equal to the last processed timestamp are treated as stale/replayed and ignored.

6.3 Outbox Pattern

Location Service does not publish Kafka directly in the request path anymore.

Instead:
- state mutation
- outbox insert

are committed atomically in one DB transaction.

Then a poller publishes pending outbox rows asynchronously.

This guarantees that event intent is not lost if DB commit succeeds.

6.4 Idempotent logging

Logging Service uses UNIQUE(event_id) so duplicate event deliveries do not create duplicate log rows.

--------------------------------------------------
7. Local Development
--------------------------------------------------

7.1 Start infrastructure

cd infra
docker compose up -d

7.2 Install dependencies

npm install

7.3 Run services

Geofence Service:
cd apps/geofence-service
npx prisma generate
npx prisma migrate deploy
npm run start:dev

Location Service:
cd apps/location-service
npx prisma generate
npx prisma migrate deploy
npm run start:dev

Logging Service:
cd apps/logging-service
npx prisma generate
npx prisma migrate deploy
npm run start:dev

Expected local ports:
- Geofence Service: 3000
- Location Service: 3001
- Logging Service: 3002
- Kafka UI: 8080

--------------------------------------------------
8. API Summary
--------------------------------------------------

8.1 POST /areas

Creates a new geofence area.

Example request:
{
  "name": "Kizilay",
  "centerLat": 39.9208,
  "centerLon": 32.8541,
  "radiusM": 400
}

Example response:
{
  "id": "uuid",
  "name": "Kizilay",
  "createdAt": "2026-03-08T10:00:00.000Z"
}

8.2 GET /areas

Returns the list of stored areas.

8.3 POST /locations

Accepts a user location and returns the computed transitions.

Example request:
{
  "userId": "57ac11b7-71cc-4372-a567-5e02b2c1d479",
  "lat": 39.9208,
  "lon": 32.8541,
  "timestamp": "2026-03-08T10:00:00Z"
}

Example response:
{
  "userId": "57ac11b7-71cc-4372-a567-5e02b2c1d479",
  "enteredAreaIds": ["..."],
  "exitedAreaIds": [],
  "timestamp": "2026-03-08T10:00:00.000Z"
}

8.4 GET /logs

Returns persisted transition logs from Logging Service.

--------------------------------------------------
9. Health Endpoints
--------------------------------------------------

- GET /health on Geofence Service
- GET /health on Location Service
- GET /health on Logging Service

These validate DB readiness.
They should not falsely report healthy if the database is unavailable.

--------------------------------------------------
10. Documentation Map
--------------------------------------------------

Additional project documentation lives under docs/:

- docs/architecture.md
  - high-level system design
- docs/edgecases.md
  - edge case checklist
- docs/casecontrol.md
  - case requirement mapping
- docs/final-verification.md
  - final validation guide
- docs/known-limitations.md
  - known trade-offs and boundaries

--------------------------------------------------
11. Testing and Verification
--------------------------------------------------

The project has been verified through:

- endpoint-level functional checks
- DB verification queries
- Kafka flow validation
- same-user concurrency scenarios
- stale replay scenarios
- overlap area behavior
- outbox retry and publish flow
- logging idempotency checks

The main verification guide is:
- docs/final-verification.md

The main case alignment guide is:
- docs/casecontrol.md

--------------------------------------------------
12. Known Limitations
--------------------------------------------------

The system is production-minded, but still intentionally bounded.

Current known limitations include:

- exactly-once delivery is not claimed
- duplicate publish is still theoretically possible in rare crash windows after Kafka ACK but before DB published-status update
- advanced stuck-processing recovery for outbox rows can be improved further in a future hardening step
- chaos/network partition testing is still limited compared to a full production environment

See:
- docs/known-limitations.md
