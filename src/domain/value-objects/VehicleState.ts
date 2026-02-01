export enum VehicleState {
    PARKING = 'PARKING',
    PARKED = 'PARKED',
    WAITING_MARKOUT = 'WAITING_MARKOUT',
    SCHEDULED = 'SCHEDULED',
    RETRIEVAL_ASSIGNED = 'RETRIEVAL_ASSIGNED',
    ON_THE_WAY = 'ON_THE_WAY',
    DELIVERED = 'DELIVERED',
    CLOSED = 'CLOSED'
}

export class VehicleStateMachine {
    private static readonly transitions: Record<VehicleState, VehicleState[]> = {
        [VehicleState.PARKING]: [VehicleState.PARKED],
        [VehicleState.PARKED]: [VehicleState.SCHEDULED, VehicleState.WAITING_MARKOUT],
        [VehicleState.WAITING_MARKOUT]: [VehicleState.SCHEDULED],
        [VehicleState.SCHEDULED]: [VehicleState.RETRIEVAL_ASSIGNED],
        [VehicleState.RETRIEVAL_ASSIGNED]: [VehicleState.ON_THE_WAY],
        [VehicleState.ON_THE_WAY]: [VehicleState.DELIVERED],
        [VehicleState.DELIVERED]: [VehicleState.CLOSED],
        [VehicleState.CLOSED]: [],
    };

    static transition(currentState: VehicleState, nextState: VehicleState): VehicleState {
        const allowed = this.transitions[currentState];
        if (!allowed || !allowed.includes(nextState)) {
            throw new Error(`Invalid state transition from ${currentState} to ${nextState}`);
        }
        return nextState;
    }

    static canBeMarkedOut(state: VehicleState): boolean {
        return [VehicleState.PARKED, VehicleState.WAITING_MARKOUT].includes(state);
    }

    static isReadyForRetrieval(state: VehicleState): boolean {
        return [VehicleState.SCHEDULED, VehicleState.RETRIEVAL_ASSIGNED].includes(state);
    }
}
