import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { PersistAreaTransitionLogUseCase } from '../../application/use-cases/persist-area-transition-log.use-case';
import { PersistAreaTransitionLogCommand } from '../../application/commands/persist-area-transition-log.command';
import { DomainValidationError } from '../../domain/errors/domain-validation.error';

/**
 * KafkaAreaTransitionConsumer
 *
 * Infrastructure component responsible for consuming area-transitions events.
 *
 * Lifecycle:
 *   onModuleInit  → connect, subscribe, start consumer loop
 *   onModuleDestroy → graceful disconnect
 *
 * Offset commit strategy: autoCommit: false
 *   Offsets are committed ONLY after a definitive outcome.
 *   Uses consumer.commitOffsets() with offset+1 (KafkaJS convention:
 *   commit the next offset to be fetched, not the current one).
 *
 *     - 'persisted'  → event saved → commit offset
 *     - 'duplicate'  → safe no-op via UNIQUE(event_id) → commit offset
 *     - invalid msg  → intentional skip (replay always fails) → commit offset
 *     - DB failure   → throw, offset NOT committed, KafkaJS will redeliver
 *
 * Raw Kafka payloads never reach the domain or use case.
 * This class parses the wire format and builds PersistAreaTransitionLogCommand.
 */
@Injectable()
export class KafkaAreaTransitionConsumer
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaAreaTransitionConsumer.name);
    private consumer: Consumer;
    private readonly kafka: Kafka;
    private readonly topic: string;
    private readonly groupId: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly persistUseCase: PersistAreaTransitionLogUseCase,
    ) {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'localhost:9092')
            .split(',');
        const clientId = this.configService.get<string>(
            'KAFKA_CLIENT_ID',
            'logging-service',
        );
        this.topic = this.configService.get<string>(
            'KAFKA_TOPIC_AREA_TRANSITIONS',
            'area-transitions',
        );
        this.groupId = this.configService.get<string>(
            'KAFKA_CONSUMER_GROUP_ID',
            'logging-service',
        );

        this.kafka = new Kafka({ clientId, brokers });
    }

    /**
     * Commits the given message's offset to Kafka.
     * KafkaJS convention: commit offset+1 (the next offset to fetch).
     */
    private async commitOffset(
        topic: string,
        partition: number,
        offset: string,
    ): Promise<void> {
        await this.consumer.commitOffsets([
            {
                topic,
                partition,
                offset: String(Number(offset) + 1),
            },
        ]);
    }

    async onModuleInit(): Promise<void> {
        this.consumer = this.kafka.consumer({ groupId: this.groupId });
        await this.consumer.connect();
        await this.consumer.subscribe({
            topic: this.topic,
            fromBeginning: false,
        });

        await this.consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value?.toString();

                // ── Step 1: Parse JSON ──────────────────────────────────────────
                let parsed: Record<string, unknown>;
                try {
                    parsed = JSON.parse(rawValue ?? '');
                } catch {
                    this.logger.warn(
                        `[${topic}/${partition}] Unparseable message — skipping. offset=${message.offset}`,
                    );
                    // Intentional skip: replay would produce the same parse failure.
                    await this.commitOffset(topic, partition, message.offset);
                    return;
                }

                // ── Step 2: Validate required fields present ────────────────────
                const { eventId, type, userId, areaId, timestamp } = parsed as {
                    eventId?: string;
                    type?: string;
                    userId?: string;
                    areaId?: string;
                    timestamp?: string;
                };

                if (
                    !eventId ||
                    !type ||
                    !userId ||
                    !areaId ||
                    !timestamp ||
                    typeof eventId !== 'string' ||
                    typeof type !== 'string' ||
                    typeof userId !== 'string' ||
                    typeof areaId !== 'string' ||
                    typeof timestamp !== 'string'
                ) {
                    this.logger.warn(
                        `[${topic}/${partition}] Invalid payload shape — missing required fields. offset=${message.offset}`,
                        { parsed },
                    );
                    await this.commitOffset(topic, partition, message.offset);
                    return;
                }

                // ── Step 3: Build command and invoke use case ───────────────────
                const command = new PersistAreaTransitionLogCommand();
                command.eventId = eventId;
                command.userId = userId;
                command.areaId = areaId;
                command.eventType = type;
                command.occurredAt = timestamp;

                try {
                    const outcome = await this.persistUseCase.execute(command);

                    if (outcome === 'persisted') {
                        this.logger.log(
                            `[${topic}/${partition}] Event persisted. eventId=${eventId} type=${type}`,
                        );
                    } else {
                        // outcome === 'duplicate'
                        this.logger.debug(
                            `[${topic}/${partition}] Duplicate event — safe no-op. eventId=${eventId}`,
                        );
                    }

                    // Both 'persisted' and 'duplicate' are successful outcomes — commit.
                    await this.commitOffset(topic, partition, message.offset);
                } catch (err) {
                    if (err instanceof DomainValidationError) {
                        // Domain rejected the payload (e.g. unknown event type, bad UUID).
                        // Replay would fail identically — intentional skip.
                        this.logger.warn(
                            `[${topic}/${partition}] Domain validation failed — skipping. eventId=${eventId} reason=${err.message}`,
                        );
                        await this.commitOffset(topic, partition, message.offset);
                        return;
                    }

                    // Unexpected DB failure or infrastructure error.
                    // Do NOT commit offset — KafkaJS will redeliver this message.
                    this.logger.error(
                        `[${topic}/${partition}] Unexpected error processing event. eventId=${eventId}`,
                        err instanceof Error ? err.stack : String(err),
                    );
                    throw err;
                }
            },
        });

        this.logger.log(
            `Kafka consumer connected. topic=${this.topic} groupId=${this.groupId}`,
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.consumer.disconnect();
        this.logger.log('Kafka consumer disconnected');
    }
}
