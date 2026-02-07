import { PrismaClient } from '@prisma/client';
import { initializeDependencies } from '../src/config/dependencies';

const prisma = new PrismaClient();

async function main() {
    const deps = initializeDependencies(prisma);

    try {
        const result = await deps.createVehicleEntry.execute({
            vehicleNumber: `TEST${Math.floor(Math.random() * 1000)}`,
            customerPhone: '9876543210',
            customerType: 'VIP',
            entryOperatorId: 'SYSTEM' // Assuming staff table has entry? Or strict FK?
            // Staff FK might be issue if 'SYSTEM' doesn't exist in staff table.
            // But user error was about parking_valet_id.
        });

        console.log('--- RESULT ---');
        console.log('Assigned Valet in Response:', result.assignedValet);

        console.log('--- DB VERIFICATION ---');
        const vehicleInDb = await prisma.vehicles.findUnique({
            where: { id: result.vehicle.id }
        });
        console.log('Vehicle in DB parking_valet_id:', vehicleInDb?.parking_valet_id);

        if (vehicleInDb?.parking_valet_id === null) {
            console.error('FAILURE: parking_valet_id is NULL in DB!');
        } else {
            console.log('SUCCESS: parking_valet_id is set correctly.');
        }

    } catch (e) {
        console.error('Execution Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
