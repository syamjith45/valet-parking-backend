import { PrismaClient } from '@prisma/client';
import { UseCases } from '../presentation/graphql/context';

// Repositories
import { VehicleRepository } from '../infrastructure/database/repositories/VehicleRepository';
import { ValetRepository } from '../infrastructure/database/repositories/ValetRepository';
import { ParkingZoneRepository } from '../infrastructure/database/repositories/ParkingZoneRepository';

// Use Cases
import { CreateVehicleEntryUseCase } from '../application/use-cases/vehicle/CreateVehicleEntry';
import { AssignValetRoundRobinUseCase } from '../application/use-cases/valet/AssignValetRoundRobin';
import { MarkVehicleParkedUseCase } from '../application/use-cases/vehicle/MarkVehicleParked';

// Services
import { WhatsAppService } from '../infrastructure/external-services/whatsapp/WhatsAppService';
import { StateTransitionService } from '../application/services/StateTransitionService';

export function initializeDependencies(prisma: PrismaClient): UseCases {
    // 1. Initialize Repositories
    const vehicleRepo = new VehicleRepository(prisma);
    const valetRepo = new ValetRepository(prisma);
    const parkingZoneRepo = new ParkingZoneRepository(prisma);

    // 2. Initialize Services
    const whatsAppService = new WhatsAppService();
    const stateTransitionService = new StateTransitionService();

    // 3. Initialize Use Cases
    const assignValetUseCase = new AssignValetRoundRobinUseCase(valetRepo);

    const createVehicleEntryUseCase = new CreateVehicleEntryUseCase(
        vehicleRepo,
        parkingZoneRepo,
        assignValetUseCase,
        whatsAppService,
        stateTransitionService
    );

    const markVehicleParkedUseCase = new MarkVehicleParkedUseCase(
        vehicleRepo,
        valetRepo,
        stateTransitionService
    );

    return {
        createVehicleEntry: createVehicleEntryUseCase,
        assignValetRoundRobin: assignValetUseCase,
        markVehicleParked: markVehicleParkedUseCase,
        requestMarkOut: null,
    };
}
