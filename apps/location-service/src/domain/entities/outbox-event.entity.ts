import { OutboxEventStatus } from '../value-objects/outbox-event-status.value-object';

export interface OutboxEventProps {
    id: string;
    eventId: string;
    aggregateType: string;
    aggregateId: string | null;
    eventType: string;
    partitionKey: string;
    payload: Record<string, unknown>;
    status: OutboxEventStatus;
    attempts: number;
    availableAt: Date;
    createdAt: Date;
}

/**
 * Domain representation of an outbox event.
 */
export class OutboxEvent {
    readonly id: string;
    readonly eventId: string;
    readonly aggregateType: string;
    readonly aggregateId: string | null;
    readonly eventType: string;
    readonly partitionKey: string;
    readonly payload: Record<string, unknown>;
    readonly status: OutboxEventStatus;
    readonly attempts: number;
    readonly availableAt: Date;
    readonly createdAt: Date;

    constructor(props: OutboxEventProps) {
        this.id = props.id;
        this.eventId = props.eventId;
        this.aggregateType = props.aggregateType;
        this.aggregateId = props.aggregateId;
        this.eventType = props.eventType;
        this.partitionKey = props.partitionKey;
        this.payload = props.payload;
        this.status = props.status;
        this.attempts = props.attempts;
        this.availableAt = props.availableAt;
        this.createdAt = props.createdAt;
    }
}
