export enum MarkOutStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export class MarkOutRequest {
    constructor(
        public id: string,
        public vehicleId: string,
        public requestedAt: Date,
        public retrieveAt: Date,
        public status: MarkOutStatus,
        public createdAt?: Date,
        public updatedAt?: Date
    ) { }

    isPending(): boolean {
        return this.status === MarkOutStatus.PENDING;
    }

    complete(): void {
        this.status = MarkOutStatus.COMPLETED;
    }

    cancel(): void {
        this.status = MarkOutStatus.CANCELLED;
    }
}
