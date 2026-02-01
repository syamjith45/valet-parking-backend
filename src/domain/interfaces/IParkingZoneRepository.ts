import { ParkingZone } from '../entities/ParkingZone';

export interface IParkingZoneRepository {
    /**
     * Find the most suitable available parking zone
     */
    findAvailableZone(): Promise<ParkingZone | null>;

    /**
     * Decrement available slots in a zone
     */
    decrementAvailableSlots(id: string): Promise<void>;

    /**
     * Increment available slots in a zone
     */
    incrementAvailableSlots(id: string): Promise<void>;
}
