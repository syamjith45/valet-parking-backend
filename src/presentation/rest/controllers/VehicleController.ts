import { Request, Response, NextFunction } from 'express';
import { CreateVehicleEntryUseCase, CreateVehicleEntryDTO } from '../../../application/use-cases/vehicle/CreateVehicleEntry';

export class VehicleController {
    constructor(
        private createVehicleEntryUseCase: CreateVehicleEntryUseCase
    ) { }

    /**
     * POST /api/vehicles/entry
     * Create a new vehicle entry
     */
    async createEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { vehicleNumber, customerPhone, customerType } = req.body;

            // map to DTO
            const dto: CreateVehicleEntryDTO = {
                vehicleNumber,
                customerPhone,
                customerType,
                // Assumes authMiddleware has populated req.user
                entryOperatorId: req.user!.id,
            };

            const result = await this.createVehicleEntryUseCase.execute(dto);

            res.status(201).json({
                message: 'Vehicle entry created successfully',
                data: result,
            });
        } catch (error: any) {
            // Pass to error handling middleware
            next(error);
        }
    }
}
