export interface VehicleEntryDTO {
    vehicleNumber: string;
    customerPhone: string;
    token?: string;
    zone?: string;
    slot?: string;
    state?: any; // To avoid circular dependency with VehicleState if not needed here, or import it
    parkingValetId?: string;
}
