import { PrismaClient } from '@prisma/client';
import { IParkingZoneRepository } from '../../../domain/interfaces/IParkingZoneRepository';
import { ParkingZone } from '../../../domain/entities/ParkingZone';

export class ParkingZoneRepository implements IParkingZoneRepository {
    constructor(private prisma: PrismaClient) { }

    async findAvailableZone(): Promise<ParkingZone | null> {
        // Find zone with highest priority (lowest number) that has available slots
        const zone = await this.prisma.parking_zones.findFirst({
            where: {
                available_slots: { gt: 0 },
                is_active: true,
            },
            orderBy: {
                priority: 'asc',
            },
        });

        return zone ? this.toDomain(zone) : null;
    }

    async decrementAvailableSlots(id: string): Promise<void> {
        await this.prisma.parking_zones.update({
            where: { id },
            data: {
                available_slots: {
                    decrement: 1,
                },
            },
        });
    }

    async incrementAvailableSlots(id: string): Promise<void> {
        await this.prisma.parking_zones.update({
            where: { id },
            data: {
                available_slots: {
                    increment: 1,
                },
            },
        });
    }

    private toDomain(dbZone: any): ParkingZone {
        return new ParkingZone(
            dbZone.id,
            dbZone.zone_code,
            dbZone.total_slots,
            dbZone.available_slots,
            dbZone.is_active,
            dbZone.created_at,
            undefined, // updatedAt - removed from DB
            dbZone.zone_name,
            dbZone.zone_description,
            dbZone.priority
        );
    }
}
