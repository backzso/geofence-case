/**
 * PersistAreaTransitionLogCommand
 *
 * Plain data object passed from the Kafka consumer (infrastructure)
 * to the use case (application). Contains raw primitive values.
 *
 * No NestJS decorators. No domain types.
 * The use case is responsible for constructing domain VOs from these values.
 */
export class PersistAreaTransitionLogCommand {
    eventId: string;
    userId: string;
    areaId: string;
    eventType: string;
    occurredAt: string;
}
