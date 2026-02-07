import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Dropping all application tables to reset database state...');
    try {
        // Drop tables in reverse dependency order (or use CASCADE)
        // Dependencies: 
        // valet_assignments -> valets, vehicles
        // state_transitions -> vehicles
        // markout_requests -> vehicles
        // vehicles -> valets, staff
        // valets -> -
        // staff -> -
        // parking_zones -> -

        const tables = [
            'valet_assignments',
            'state_transitions',
            'markout_requests',
            'vehicles',
            'valets',
            'staff',
            'parking_zones'
        ];

        for (const table of tables) {
            console.log(`Dropping table ${table}...`);
            await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."${table}" CASCADE;`);
        }

        console.log('All tables dropped successfully.');
    } catch (e) {
        console.error('Error dropping tables:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
