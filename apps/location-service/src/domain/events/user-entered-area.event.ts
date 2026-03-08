/**
 * Immutable domain event for entering a geofence.
 */
export class UserEnteredAreaEvent {
    readonly eventId: string;
    readonly type = 'UserEnteredArea' as const;
    readonly userId: string;
    readonly areaId: string;
    readonly timestamp: string;

    constructor(props: {
        eventId: string;
        userId: string;
        areaId: string;
        timestamp: string;
    }) {
        this.eventId = props.eventId;
        this.userId = props.userId;
        this.areaId = props.areaId;
        this.timestamp = props.timestamp;
    }
}
