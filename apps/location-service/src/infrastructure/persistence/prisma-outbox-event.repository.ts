import { Injectable } from '@nestjs/common';
import { Prisma } from './generated';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { OutboxEventStatus } from '../../domain/value-objects/outbox-event-status.value-object';
import {
  IOutboxEventRepository,
  OutboxEventInput,
} from '../../application/ports/outbox-event.repository.port';
import { TransactionContext } from '../../application/ports/location-transaction.manager.port';
import { PrismaService } from './prisma.service';

type OutboxEventRow = {
  id: string;
  event_id: string;
  aggregate_type: string;
  aggregate_id: string | null;
  event_type: string;
  partition_key: string;
  payload: unknown;
  status: string;
  attempts: number;
  available_at: Date;
  created_at: Date;
};

/**
 * Implements atomic outbox persistence and concurrent polling claims.
 * Uses CTE + FOR UPDATE SKIP LOCKED to prevent duplicate claiming across workers.
 */
@Injectable()
export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaService) { }

  async insertBatch(
    inputs: OutboxEventInput[],
    tx: TransactionContext,
  ): Promise<void> {
    if (inputs.length === 0) return;

    const client = tx as Prisma.TransactionClient;

    // Build value rows for batched insert
    const valueRows = Prisma.join(
      inputs.map(
        (input) =>
          Prisma.sql`(
            ${input.eventId}::uuid,
            ${input.aggregateType},
            ${input.aggregateId ?? null}::uuid,
            ${input.eventType},
            ${input.partitionKey},
            ${JSON.stringify(input.payload)}::jsonb,
            'pending'
          )`,
      ),
    );

    await client.$executeRaw`
      INSERT INTO location.outbox_events
        (event_id, aggregate_type, aggregate_id, event_type, partition_key, payload, status)
      VALUES ${valueRows}
    `;
  }

  async claimPendingBatch(limit: number): Promise<OutboxEvent[]> {
    // Atomic claim: FOR UPDATE SKIP LOCKED transitions rows to processing instantly.
    const rows = await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<OutboxEventRow[]>`
        WITH claimed AS (
          SELECT id
          FROM location.outbox_events
          WHERE status = 'pending'
            AND available_at <= NOW()
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE location.outbox_events o
        SET status = 'processing', updated_at = NOW()
        FROM claimed
        WHERE o.id = claimed.id
        RETURNING
          o.id,
          o.event_id,
          o.aggregate_type,
          o.aggregate_id,
          o.event_type,
          o.partition_key,
          o.payload,
          o.status,
          o.attempts,
          o.available_at,
          o.created_at
      `;
    });

    return rows.map((row) => this.mapRow(row));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE location.outbox_events
      SET status = 'published',
          published_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  }

  async resetToRetryable(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE location.outbox_events
      SET status = 'pending',
          attempts = attempts + 1,
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  }

  private mapRow(row: OutboxEventRow): OutboxEvent {
    return new OutboxEvent({
      id: row.id,
      eventId: row.event_id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      partitionKey: row.partition_key,
      payload: row.payload as Record<string, unknown>,
      status: OutboxEventStatus.from(row.status),
      attempts: row.attempts,
      availableAt: row.available_at,
      createdAt: row.created_at,
    });
  }
}
