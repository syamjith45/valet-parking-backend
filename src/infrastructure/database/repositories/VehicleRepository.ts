import { PrismaClient } from '@prisma/client';
import { IVehicleRepository } from '../../../domain/interfaces/IVehicleRepository';
import { Vehicle } from '../../../domain/entities/Vehicle';
import { VehicleEntryDTO } from '../../../application/dtos/VehicleEntryDTO';
import { VehicleState } from '../../../domain/value-objects/VehicleState';

export class VehicleRepository implements IVehicleRepository {
    constructor(private prisma: PrismaClient) { }

    async create(data: VehicleEntryDTO): Promise<Vehicle> {
        const vehicle = await this.prisma.vehicles.create({
            data: {
                token: data.token!,
                vehicle_number: data.vehicleNumber,
                customer_phone: data.customerPhone,
                zone: data.zone!,
                slot: data.slot!,
                state: data.state,
                parking_valet_id: data.parkingValetId,
            },
        });

        return this.toDomain(vehicle);
    }

    async findById(id: string): Promise<Vehicle | null> {
        const vehicle = await this.prisma.vehicles.findUnique({
            where: { id },
        });
        return vehicle ? this.toDomain(vehicle) : null;
    }

    async findByToken(token: string): Promise<Vehicle | null> {
        const vehicle = await this.prisma.vehicles.findUnique({
            where: { token },
            include: {
                parking_valet: true,
                retrieval_valet: true,
            },
        });

        return vehicle ? this.toDomain(vehicle) : null;
    }

    async updateState(id: string, state: VehicleState): Promise<Vehicle> {
        const vehicle = await this.prisma.vehicles.update({
            where: { id },
            data: { state },
        });
        return this.toDomain(vehicle);
    }

    async findParkedVehicles(): Promise<Vehicle[]> {
        const vehicles = await this.prisma.vehicles.findMany({
            where: { state: VehicleState.PARKED },
        });
        return vehicles.map(v => this.toDomain(v));
    }

    private toDomain(dbVehicle: any): Vehicle {
        return new Vehicle(
            dbVehicle.id,
            dbVehicle.token,
            dbVehicle.vehicle_number,
            dbVehicle.customer_phone,
            dbVehicle.zone,
            dbVehicle.slot,
            dbVehicle.state as VehicleState,
            dbVehicle.customer_type,
            dbVehicle.created_at, // arrivedAt -> created_at (DB mismatch work-around)
            undefined, // parkedAt
            undefined, // markoutRequestedAt
            dbVehicle.scheduled_at,
            undefined, // retrievalStartedAt
            undefined, // deliveredAt
            undefined, // closedAt
            dbVehicle.entry_operator_id,
            dbVehicle.parking_valet_id,
            dbVehicle.retrieval_valet_id,
            dbVehicle.created_at,
            dbVehicle.updated_at
        );
    }

    async findActiveByVehicleNumber(vehicleNumber: string): Promise<Vehicle | null> {
        const vehicle = await this.prisma.vehicles.findFirst({
            where: {
                vehicle_number: vehicleNumber,
                state: {
                    notIn: [VehicleState.DELIVERED, VehicleState.CLOSED]
                }
            },
            include: {
                parking_valet: true,
                retrieval_valet: true,
            },
        });

        return vehicle ? this.toDomain(vehicle) : null;
    }

    async findByDate(date: Date): Promise<Vehicle[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const vehicles = await this.prisma.vehicles.findMany({
            where: {
                created_at: { // Fixed: arrived_at -> created_at
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        return vehicles.map(v => this.toDomain(v));
    }
}
