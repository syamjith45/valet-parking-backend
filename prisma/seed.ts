import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Create parking zones
    console.log('Creating Parking Zones...');
    await prisma.parkingZone.deleteMany(); // Clear existing
    await prisma.parkingZone.createMany({
        data: [
            {
                zoneCode: 'A',
                zoneName: 'Near Shop',
                totalSlots: 40,
                availableSlots: 40,
                priority: 1,
                is_active: true
            },
            {
                zoneCode: 'B',
                zoneName: 'Open Area',
                totalSlots: 80,
                availableSlots: 80,
                priority: 2,
                is_active: true
            },
            {
                zoneCode: 'C',
                zoneName: 'Roadside',
                totalSlots: 60,
                availableSlots: 60,
                priority: 3,
                is_active: true
            },
        ],
    });

    // 2. Create test valets
    console.log('Creating Valets...');
    await prisma.valet.deleteMany();
    for (let i = 1; i <= 10; i++) {
        await prisma.valet.create({
            data: {
                name: `Valet ${i}`,
                phone: `98765${i.toString().padStart(5, '0')}`,
                employee_id: `V${i.toString().padStart(3, '0')}`,
                status: 'FREE',
                total_count: 0,
                today_count: 0,
                assignment_sequence: 0,
                is_active: true
            },
        });
    }

    // 3. Create initial staff (Optional - usually done via Auth, but good for testing)
    // We won't create Staff here because it requires Auth User ID from Supabase
    // but we can create a placeholder if needed.
    console.log('ℹ️ Staff users should be created via scripts/create-staff.ts after Supabase Auth');

    console.log('✅ Seed data created successfully');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
