import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { IOutboxPublisher } from '../../application/ports/outbox.publisher.port';

/**
 * KafkaOutboxPublisher
 *
 * Infrastructure implementation of IOutboxPublisher.
 *
 * Publishes a single claimed outbox event to the area-transitions Kafka topic.
 * Partition key = OutboxEvent.partitionKey (= userId) for per-user ordering.
 * Payload is the JSONB object from the outbox row — no re-serialization.
 *
 * Lifecycle:
 *   OnModuleInit     — connect producer once at startup
 *   OnModuleDestroy  — disconnect on graceful shutdown
 *
 * The producer is created once and reused for all publish calls.
 * No per-call producer creation.
 */
@Injectable()
export class KafkaOutboxPublisher implements IOutboxPublisher, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaOutboxPublisher.name);
    private producer: Producer;
    private readonly kafka: Kafka;
    private readonly topic: string;

    constructor(private readonly configService: ConfigService) {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'localhost:9092')
            .split(',');
        const clientId = this.configService.get<string>(
            'KAFKA_CLIENT_ID',
            'location-service',
        );
        this.topic = this.configService.get<string>(
            'KAFKA_TOPIC_AREA_TRANSITIONS',
            'area-transitions',
        );

        this.kafka = new Kafka({ clientId, brokers });
    }

    async onModuleInit(): Promise<void> {
        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.DefaultPartitioner,
        });
        await this.producer.connect();
        this.logger.log('Kafka outbox producer connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.producer.disconnect();
        this.logger.log('Kafka outbox producer disconnected');
    }

    /**
     * Publishes a single outbox event.
     * Throws on Kafka failure — caller (DispatchPendingOutboxEventsUseCase)
     * handles the failure by calling resetToRetryable().
     */
    async publish(event: OutboxEvent): Promise<void> {
        await this.producer.send({
            topic: this.topic,
            messages: [
                {
                    key: event.partitionKey,
                    value: JSON.stringify(event.payload),
                },
            ],
        });
    }
}
