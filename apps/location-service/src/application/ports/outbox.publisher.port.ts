import { OutboxEvent } from '../../domain/entities/outbox-event.entity';

/**
 * IOutboxPublisher — Application Port
 *
 * Publishes a single outbox event to the Kafka topic.
 * Implemented in infrastructure by KafkaOutboxPublisher.
 *
 * Each call targets one outbox row. The caller (DispatchPendingOutboxEventsUseCase)
 * iterates the claimed batch and finalizes each row independently based on the outcome.
 *
 * Partition key is carried in OutboxEvent.partitionKey (= userId).
 * Payload is the pre-serialized JSONB object from the outbox row — no re-serialization.
 */
export interface IOutboxPublisher {
    publish(event: OutboxEvent): Promise<void>;
}

export const OUTBOX_PUBLISHER = Symbol('IOutboxPublisher');
