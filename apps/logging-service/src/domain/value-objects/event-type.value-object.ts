import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * VALID_TYPES is the closed set of accepted transition event types.
 * Any value outside this set is rejected at domain construction time.
 */
const VALID_TYPES = ['UserEnteredArea', 'UserExitedArea'] as const;
export type EventTypeLiteral = (typeof VALID_TYPES)[number];

/**
 * EventType — Value Object
 *
 * Enforces that only known event types enter the domain.
 * Unknown types throw DomainValidationError, which the Kafka consumer
 * catches and treats as an intentional skip (offset committed, no crash).
 */
export class EventType {
    private readonly _value: EventTypeLiteral;

    private constructor(value: EventTypeLiteral) {
        this._value = value;
    }

    static create(raw: string): EventType {
        if (!raw || raw.trim().length === 0) {
            throw new DomainValidationError('EventType must not be empty');
        }

        const trimmed = raw.trim();

        if (!VALID_TYPES.includes(trimmed as EventTypeLiteral)) {
            throw new DomainValidationError(
                `Unknown event type: "${trimmed}". Valid types: ${VALID_TYPES.join(', ')}`,
            );
        }

        return new EventType(trimmed as EventTypeLiteral);
    }

    get value(): string {
        return this._value;
    }
}
