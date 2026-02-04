const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Parking Zones
    const zones = [
        {
            zone_code: 'A',
            zone_name: 'VIP Zone',
            zone_description: 'Near entrance',
            total_slots: 20,
            available_slots: 20,
            priority: 1,
            is_active: true
        },
        {
            zone_code: 'B',
            zone_name: 'Regular Zone',
            zone_description: 'Basement Level 1',
            total_slots: 50,
            available_slots: 50,
            priority: 2,
            is_active: true
        }
    ];

    for (const zone of zones) {
        await prisma.parking_zones.upsert({
            where: { zone_code: zone.zone_code },
            update: {},
            create: zone,
        });
        console.log(`✅ Created zone: ${zone.zone_code}`);
    }

    // 2. Create Test Valets
    const valets = [
        {
            name: 'John Doe',
            phone: '9876543210',
            employee_id: 'V001',
            status: 'FREE',
            is_active: true
        },
        {
            name: 'Jane Smith',
            phone: '9876543211',
            employee_id: 'V002',
            status: 'FREE',
            is_active: true
        }
    ];

    for (const valet of valets) {
        await prisma.valets.upsert({
            where: { phone: valet.phone },
            update: {},
            create: valet,
        });
        console.log(`✅ Created valet: ${valet.name}`);
    }

    console.log('🚀 Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
