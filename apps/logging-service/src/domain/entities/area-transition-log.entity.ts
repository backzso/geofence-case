import { EventId } from '../value-objects/event-id.value-object';
import { UserId } from '../value-objects/user-id.value-object';
import { AreaId } from '../value-objects/area-id.value-object';
import { EventType } from '../value-objects/event-type.value-object';
import { EventOccurredAt } from '../value-objects/event-occurred-at.value-object';

export interface AreaTransitionLogProps {
    eventId: string;
    userId: string;
    areaId: string;
    eventType: string;
    occurredAt: string | Date;
}

/**
 * AreaTransitionLog — Domain Entity
 *
 * Represents an immutable audit record of a geofence transition event.
 * Constructed exclusively via static factory to enforce all invariants.
 *
 * No dependency on NestJS, Prisma, Kafka, or any infrastructure concern.
 */
export class AreaTransitionLog {
    readonly eventId: EventId;
    readonly userId: UserId;
    readonly areaId: AreaId;
    readonly eventType: EventType;
    readonly occurredAt: EventOccurredAt;

    private constructor(props: {
        eventId: EventId;
        userId: UserId;
        areaId: AreaId;
        eventType: EventType;
        occurredAt: EventOccurredAt;
    }) {
        this.eventId = props.eventId;
        this.userId = props.userId;
        this.areaId = props.areaId;
        this.eventType = props.eventType;
        this.occurredAt = props.occurredAt;
    }

    /**
     * Factory method — constructs all Value Objects.
     * Throws DomainValidationError on any invariant violation.
     */
    static create(props: AreaTransitionLogProps): AreaTransitionLog {
        return new AreaTransitionLog({
            eventId: EventId.create(props.eventId),
            userId: UserId.create(props.userId),
            areaId: AreaId.create(props.areaId),
            eventType: EventType.create(props.eventType),
            occurredAt: EventOccurredAt.create(props.occurredAt),
        });
    }
}
