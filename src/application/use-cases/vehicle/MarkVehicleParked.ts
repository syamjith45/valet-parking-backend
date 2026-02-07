import { Vehicle } from '../../../domain/entities/Vehicle';
import { IVehicleRepository } from '../../../domain/interfaces/IVehicleRepository';
import { IValetRepository } from '../../../domain/interfaces/IValetRepository';
import { StateTransitionService } from '../../services/StateTransitionService';
import { VehicleState } from '../../../domain/value-objects/VehicleState';

export class MarkVehicleParkedUseCase {
    constructor(
        private vehicleRepo: IVehicleRepository,
        private valetRepo: IValetRepository,
        private stateTransitionService: StateTransitionService
    ) { }

    async execute(input: { vehicleId: string; valetId?: string }): Promise<Vehicle> {
        const { vehicleId } = input;

        // 1. Get vehicle
        const vehicle = await this.vehicleRepo.findById(vehicleId);
        if (!vehicle) throw new Error('Vehicle not found');

        // 2. Verify we have a parking valet assigned
        if (!vehicle.parkingValetId) {
            throw new Error('No parking valet assigned to this vehicle');
        }

        // 3. Get the valet
        const valet = await this.valetRepo.findById(vehicle.parkingValetId);
        if (!valet) throw new Error('Assigned valet not found');

        // 4. Mark vehicle as parked (domain logic)
        vehicle.markAsParked();

        // 5. Update vehicle in DB
        await this.vehicleRepo.updateState(vehicle.id, vehicle.state);

        // 6. Free up valet
        valet.completeTask();
        await this.valetRepo.update(valet);

        // 7. Log state transition
        await this.stateTransitionService.logTransition({
            vehicleId: vehicle.id,
            fromState: VehicleState.PARKING,
            toState: VehicleState.PARKED,
            triggeredBy: 'VALET',
            triggeredById: valet.id,
        });

        return vehicle;
    }
}
