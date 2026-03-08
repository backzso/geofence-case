import { Injectable } from '@nestjs/common';
import { Prisma } from './generated';
import { AreaTransitionLog } from '../../domain/entities/area-transition-log.entity';
import {
  AreaTransitionLogReadModel,
  IAreaTransitionLogRepository,
} from '../../application/ports/area-transition-log.repository.port';
import { PrismaService } from './prisma.service';

/**
 * Implements IAreaTransitionLogRepository.
 * Uses ON CONFLICT (event_id) DO NOTHING to achieve idempotent Kafka consumption.
 */
@Injectable()
export class PrismaAreaTransitionLogRepository
  implements IAreaTransitionLogRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(log: AreaTransitionLog): Promise<'persisted' | 'duplicate'> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO logging.area_transition_logs
        (event_id, user_id, area_id, event_type, occurred_at)
      VALUES (
        ${log.eventId.value}::uuid,
        ${log.userId.value}::uuid,
        ${log.areaId.value}::uuid,
        ${log.eventType.value},
        ${log.occurredAt.value}
      )
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id
    `;


    return rows.length === 0 ? 'duplicate' : 'persisted';
  }

  async findAll(): Promise<AreaTransitionLogReadModel[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        event_id: string;
        user_id: string;
        area_id: string;
        event_type: string;
        occurred_at: Date;
        received_at: Date;
      }>
    >`
      SELECT id, event_id, user_id, area_id, event_type, occurred_at, received_at
      FROM logging.area_transition_logs
      ORDER BY occurred_at DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      areaId: row.area_id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      receivedAt: row.received_at,
    }));
  }
}
