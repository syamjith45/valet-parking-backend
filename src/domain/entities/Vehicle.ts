import { VehicleState, VehicleStateMachine } from '../value-objects/VehicleState';

/**
 * Vehicle Entity
 * 
 * Represents a vehicle in the parking system.
 * Contains business logic and state management.
 */
export class Vehicle {
    constructor(
        public readonly id: string,
        public readonly token: string,
        public readonly vehicleNumber: string,
        public readonly customerPhone: string,
        public readonly zone: string,
        public readonly slot: string,
        public state: VehicleState,
        public readonly customerType?: string,
        public readonly arrivedAt: Date = new Date(),
        public parkedAt?: Date,
        public markoutRequestedAt?: Date,
        public scheduledAt?: Date,
        public retrievalStartedAt?: Date,
        public deliveredAt?: Date,
        public closedAt?: Date,
        public readonly entryOperatorId?: string,
        public parkingValetId?: string,
        public retrievalValetId?: string,
        public readonly createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
    ) { }

    /**
     * Business Logic: Check if vehicle can be marked as parked
     */
    canBeMarkedParked(): boolean {
        return this.state === VehicleState.PARKING && this.parkingValetId !== undefined;
    }

    /**
     * Business Logic: Mark vehicle as parked
     */
    markAsParked(): void {
        if (!this.canBeMarkedParked()) {
            throw new Error(`Cannot mark vehicle as parked. Current state: ${this.state}`);
        }

        this.state = VehicleStateMachine.transition(this.state, VehicleState.PARKED);
        this.parkedAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Check if mark-out request can be created
     */
    canRequestMarkOut(): boolean {
        return VehicleStateMachine.canBeMarkedOut(this.state);
    }

    /**
     * Business Logic: Request mark-out (customer selects time)
     */
    requestMarkOut(selectedMinutes: number): void {
        if (!this.canRequestMarkOut()) {
            throw new Error(`Cannot request mark-out. Current state: ${this.state}`);
        }

        if (![5, 7, 10].includes(selectedMinutes)) {
            throw new Error(`Invalid mark-out time. Must be 5, 7, or 10 minutes`);
        }

        this.state = VehicleStateMachine.transition(this.state, VehicleState.SCHEDULED);
        this.markoutRequestedAt = new Date();
        this.scheduledAt = new Date(Date.now() + selectedMinutes * 60 * 1000);
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Assign retrieval valet
     */
    assignRetrievalValet(valetId: string): void {
        if (!VehicleStateMachine.isReadyForRetrieval(this.state)) {
            throw new Error(`Cannot assign retrieval valet. Current state: ${this.state}`);
        }

        this.retrievalValetId = valetId;
        this.state = VehicleStateMachine.transition(this.state, VehicleState.RETRIEVAL_ASSIGNED);
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Check if retrieval time has arrived
     */
    isRetrievalTimeReached(): boolean {
        if (!this.scheduledAt) return false;
        return new Date() >= this.scheduledAt;
    }

    /**
     * Business Logic: Start retrieval (valet taps "START RETRIEVAL")
     */
    startRetrieval(): void {
        if (!VehicleStateMachine.isReadyForRetrieval(this.state)) {
            throw new Error(`Cannot start retrieval. Current state: ${this.state}`);
        }

        if (!this.isRetrievalTimeReached()) {
            throw new Error('Retrieval time has not been reached yet');
        }

        this.state = VehicleStateMachine.transition(this.state, VehicleState.ON_THE_WAY);
        this.retrievalStartedAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Mark as delivered
     */
    markAsDelivered(): void {
        if (this.state !== VehicleState.ON_THE_WAY) {
            throw new Error(`Cannot mark as delivered. Current state: ${this.state}`);
        }

        this.state = VehicleStateMachine.transition(this.state, VehicleState.DELIVERED);
        this.deliveredAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Close the vehicle record (customer confirmed)
     */
    close(): void {
        if (this.state !== VehicleState.DELIVERED) {
            throw new Error(`Cannot close. Current state: ${this.state}`);
        }

        this.state = VehicleStateMachine.transition(this.state, VehicleState.CLOSED);
        this.closedAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Calculate total parking duration
     */
    getTotalDuration(): number | null {
        if (!this.parkedAt || !this.deliveredAt) return null;
        return Math.floor((this.deliveredAt.getTime() - this.parkedAt.getTime()) / 1000 / 60); // minutes
    }

    /**
     * Calculate retrieval duration
     */
    getRetrievalDuration(): number | null {
        if (!this.retrievalStartedAt || !this.deliveredAt) return null;
        return Math.floor((this.deliveredAt.getTime() - this.retrievalStartedAt.getTime()) / 1000 / 60); // minutes
    }

    /**
     * Check if vehicle is overdue for retrieval
     */
    isOverdueForRetrieval(): boolean {
        if (!this.scheduledAt || this.state !== VehicleState.SCHEDULED) return false;
        const overdueThreshold = 2 * 60 * 1000; // 2 minutes
        return new Date().getTime() - this.scheduledAt.getTime() > overdueThreshold;
    }
}
