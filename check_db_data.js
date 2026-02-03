
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
    console.log('--- Database Record Counts ---');

    const models = [
        { name: 'Vehicles', delegate: prisma.vehicles },
        { name: 'Valets', delegate: prisma.valets },
        { name: 'Parking Zones', delegate: prisma.parking_zones },
        { name: 'Staff', delegate: prisma.staff },
        { name: 'Mark Out Requests', delegate: prisma.mark_out_requests }
    ];

    let hasData = false;
    let missingTables = [];

    for (const model of models) {
        if (!model.delegate) {
            console.log(`${model.name}: ❌ Delegate not found (Check Prisma Client generation)`);
            missingTables.push(model.name);
            continue;
        }
        try {
            const count = await model.delegate.count();
            console.log(`${model.name}: ${count}`);
            if (count > 0) hasData = true;
        } catch (error) {
            if (error.code === 'P2021') {
                console.log(`${model.name}: ❌ Table does not exist in DB`);
                missingTables.push(model.name);
            } else {
                console.error(`${model.name}: Error - ${error.message}`);
            }
        }
    }

    console.log('------------------------------');

    if (missingTables.length > 0) {
        console.log('⚠️  Some tables are missing from the database. You may need to run `npx prisma db push` or `npx prisma migrate dev`.');
    }

    if (!hasData && missingTables.length === 0) {
        console.log('✅ Database is fully initialized and empty.');
    } else if (!hasData && missingTables.length > 0) {
        console.log('✅ Existing tables are empty (but some are missing).');
    } else {
        console.log('ℹ️  Database contains data.');
    }

    await prisma.$disconnect();
}

checkDatabase();
