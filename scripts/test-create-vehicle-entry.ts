import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testCreateEntry() {
    const token = process.argv[2];
    if (!token) {
        console.error('Usage: npx ts-node scripts/test-create-vehicle-entry.ts <jwt-token>');
        process.exit(1);
    }

    const payload = {
        vehicleNumber: 'KL01AB1234',
        customerPhone: '9876543210',
        customerType: 'VIP'
    };

    console.log('Sending request to http://localhost:4000/api/vehicles/entry ...');
    console.log('Payload:', payload);

    try {
        const response = await fetch('http://localhost:4000/api/vehicles/entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log('\nResponse Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Test Passed: Vehicle entry created successfully.');
        } else {
            console.error('\n❌ Test Failed: Server returned error.');
        }

    } catch (error) {
        console.error('❌ Test Failed: Network error or server not running.', error);
    }
}

testCreateEntry();
