/**
 * Aggregate root for geofence membership state.
 * Computes pure enter/exit transitions via set-difference.
 */
export class UserAreaState {

    static computeTransitions(
        previousInsideAreaIds: Set<string>,
        currentInsideAreaIds: Set<string>,
    ): { enteredAreaIds: string[]; exitedAreaIds: string[] } {
        const enteredAreaIds: string[] = [];
        const exitedAreaIds: string[] = [];

        // ENTER: in current but not in previous
        for (const areaId of currentInsideAreaIds) {
            if (!previousInsideAreaIds.has(areaId)) {
                enteredAreaIds.push(areaId);
            }
        }

        // EXIT: in previous but not in current
        for (const areaId of previousInsideAreaIds) {
            if (!currentInsideAreaIds.has(areaId)) {
                exitedAreaIds.push(areaId);
            }
        }

        return { enteredAreaIds, exitedAreaIds };
    }
}
