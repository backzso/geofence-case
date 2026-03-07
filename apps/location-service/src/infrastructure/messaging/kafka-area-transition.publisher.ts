import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import {
    AreaTransitionEvent,
    IAreaTransitionPublisher,
} from '../../application/ports/area-transition.publisher.port';

/**
 * KafkaAreaTransitionPublisher
 *
 * Infrastructure implementation of IAreaTransitionPublisher.
 *
 * Uses KafkaJS to publish geofence transition events.
 *
 * Lifecycle:
 *   - Producer is created and connected ONCE at application startup (OnModuleInit)
 *   - Reused for all requests via DI — never created per-request
 *   - Disconnected on application shutdown (OnModuleDestroy)
 *
 * Partition key = userId for ordering guarantees within a user's event stream.
 * Multiple transitions from a single request are sent as a batch.
 */
@Injectable()
export class KafkaAreaTransitionPublisher
    implements IAreaTransitionPublisher, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaAreaTransitionPublisher.name);
    private producer: Producer;
    private readonly topic: string;
    private readonly kafka: Kafka;

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
        this.logger.log('Kafka producer connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.producer.disconnect();
        this.logger.log('Kafka producer disconnected');
    }

    /**
     * Publishes transition events as a batch to the area-transitions topic.
     * Each message uses userId as the partition key.
     *
     * Called AFTER the database transaction has committed.
     * If this fails, the caller (use case) will propagate the error.
     */
    async publishTransitions(events: AreaTransitionEvent[]): Promise<void> {
        if (events.length === 0) {
            return;
        }

        const messages = events.map((event) => ({
            key: event.userId,
            value: JSON.stringify({
                eventId: event.eventId,
                type: event.type,
                userId: event.userId,
                areaId: event.areaId,
                timestamp: event.timestamp,
            }),
        }));

        await this.producer.send({
            topic: this.topic,
            messages,
        });

        this.logger.log(
            `Published ${events.length} transition event(s) to ${this.topic}`,
        );
    }
}
