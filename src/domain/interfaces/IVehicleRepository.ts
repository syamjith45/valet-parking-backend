import { Vehicle } from '../entities/Vehicle';
import { VehicleState } from '../value-objects/VehicleState';

export interface IVehicleRepository {
    create(vehicle: Vehicle): Promise<Vehicle>;
    findById(id: string): Promise<Vehicle | null>;
    findByToken(token: string): Promise<Vehicle | null>;
    findActiveByVehicleNumber(vehicleNumber: string): Promise<Vehicle | null>;
    findByDate(date: Date): Promise<Vehicle[]>;
    updateState(id: string, state: VehicleState): Promise<Vehicle>;
    findParkedVehicles(): Promise<Vehicle[]>;
}
