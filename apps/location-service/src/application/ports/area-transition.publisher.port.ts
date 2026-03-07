import { UserEnteredAreaEvent } from '../../domain/events/user-entered-area.event';
import { UserExitedAreaEvent } from '../../domain/events/user-exited-area.event';

export type AreaTransitionEvent = UserEnteredAreaEvent | UserExitedAreaEvent;

/**
 * IAreaTransitionPublisher — Application Port
 *
 * Publishes geofence transition events to an external messaging system.
 * Infrastructure determines the concrete transport (Kafka).
 *
 * Events must only be published AFTER the database transaction commits.
 * Partition key must equal userId for ordering guarantees.
 */
export interface IAreaTransitionPublisher {
    publishTransitions(events: AreaTransitionEvent[]): Promise<void>;
}

export const AREA_TRANSITION_PUBLISHER = Symbol('IAreaTransitionPublisher');
