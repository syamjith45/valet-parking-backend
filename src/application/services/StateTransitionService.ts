import { VehicleState } from '../../domain/value-objects/VehicleState';

export interface StateTransitionLog {
    vehicleId: string;
    fromState: VehicleState | null;
    toState: VehicleState;
    triggeredBy: string;
    triggeredById: string;
    metadata?: Record<string, any>;
}

export class StateTransitionService {
    async logTransition(log: StateTransitionLog): Promise<void> {
        // Stub implementation - log to console
        console.log(`[StateTransition] Vehicle ${log.vehicleId}: ${log.fromState} -> ${log.toState} by ${log.triggeredBy} (${log.triggeredById})`);
        if (log.metadata) {
            console.log(`[StateTransition] Metadata:`, log.metadata);
        }
        return Promise.resolve();
    }
}
