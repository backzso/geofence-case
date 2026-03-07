import { AreaTransitionLogReadModel } from '../../application/ports/area-transition-log.repository.port';

/**
 * AreaTransitionLogResponseDto
 *
 * Serializable HTTP response for a single log entry.
 * Timestamps are ISO 8601 strings for deterministic JSON serialization.
 */
export class AreaTransitionLogResponseDto {
    id: string;
    eventId: string;
    userId: string;
    areaId: string;
    eventType: string;
    occurredAt: string;
    receivedAt: string;

    static from(model: AreaTransitionLogReadModel): AreaTransitionLogResponseDto {
        const dto = new AreaTransitionLogResponseDto();
        dto.id = model.id;
        dto.eventId = model.eventId;
        dto.userId = model.userId;
        dto.areaId = model.areaId;
        dto.eventType = model.eventType;
        dto.occurredAt = model.occurredAt.toISOString();
        dto.receivedAt = model.receivedAt.toISOString();
        return dto;
    }
}
