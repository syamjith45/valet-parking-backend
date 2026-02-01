export class ParkingZone {
    constructor(
        public id: string,
        public zoneCode: string,
        public totalSlots: number,
        public availableSlots: number,
        public isActive: boolean,
        public createdAt?: Date,
        public updatedAt?: Date
    ) { }

    hasAvailability(): boolean {
        return this.availableSlots > 0 && this.isActive;
    }

    occupySlot(): void {
        if (this.availableSlots <= 0) {
            throw new Error('No slots available');
        }
        this.availableSlots--;
    }

    releaseSlot(): void {
        if (this.availableSlots >= this.totalSlots) {
            throw new Error('All slots already free');
        }
        this.availableSlots++;
    }
}
