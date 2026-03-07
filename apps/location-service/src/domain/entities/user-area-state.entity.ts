/**
 * UserAreaState — Domain Entity
 *
 * The aggregate root for geofence membership state.
 * Contains the pure transition computation logic.
 *
 * computeTransitions is a static pure function:
 *   enteredAreaIds = currentInside − previousInside
 *   exitedAreaIds  = previousInside − currentInside
 *
 * No dependency on NestJS, Prisma, or any infrastructure concern.
 */
export class UserAreaState {
    /**
     * Computes ENTER and EXIT transitions by diffing two sets of area IDs.
     *
     * @param previousInsideAreaIds - areas the user was inside (from DB state)
     * @param currentInsideAreaIds  - areas the user is inside now (from PostGIS query)
     * @returns enteredAreaIds (new entries) and exitedAreaIds (departures)
     */
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
