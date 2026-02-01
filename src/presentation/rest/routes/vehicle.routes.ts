import { Router } from 'express';
import { UseCases } from '../../graphql/context';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { VehicleController } from '../controllers/VehicleController';

export function createVehicleRouter(useCases: UseCases): Router {
    const router = Router();
    const vehicleController = new VehicleController(useCases.createVehicleEntry);

    // POST /api/vehicles/entry
    // Protected by auth and potentially role (e.g. only ENTRY or SUPERVISOR)
    // For now, just auth is enough, or we can add specific roles
    router.post(
        '/entry',
        authMiddleware,
        // requireRole(['ENTRY', 'SUPERVISOR']), // Uncomment if strict role check needed
        (req, res, next) => vehicleController.createEntry(req, res, next)
    );

    return router;
}
