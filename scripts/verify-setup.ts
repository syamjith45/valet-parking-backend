import { WhatsAppService } from '../src/infrastructure/external-services/whatsapp/WhatsAppService';
import { env } from '../src/config/env';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env for manual testing if needed, though env.ts does it too
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifySetup() {
    console.log('--- Verifying Backend Setup ---');

    console.log('\n1. Checking Environment Variables');
    try {
        console.log('✅ SUPABASE_URL:', env.SUPABASE_URL ? 'Set' : 'MISSING (Should crash)');
        console.log('✅ SUPABASE_KEY:', env.SUPABASE_KEY ? 'Set' : 'MISSING (Should crash)');
        console.log('ℹ️ WHATSAPP_API_URL:', env.WHATSAPP_API_URL || 'Not Set (Optional)');
        console.log('ℹ️ WHATSAPP_TOKEN:', env.WHATSAPP_TOKEN ? 'Set' : 'Not Set (Optional)');
    } catch (error) {
        console.error('❌ Environment check failed:', error);
    }

    console.log('\n2. Checking WhatsApp Service (Optional Config)');
    const whatsAppService = new WhatsAppService();
    try {
        // Mock message
        await whatsAppService.sendTokenMessage({
            phoneNumber: '9999999999',
            token: 'TEST-TOKEN',
            vehicleNumber: 'TEST-VEHICLE',
            zone: 'A',
            slot: '1'
        });
        console.log('✅ WhatsAppService executed successfully (check logs above for "Skipped" or "Sending")');
    } catch (error) {
        console.error('❌ WhatsAppService failed:', error);
    }

    console.log('\n3. Checking Auth Middleware Dependencies');
    try {
        const { createClient } = require('@supabase/supabase-js');
        console.log('✅ @supabase/supabase-js is installed');
    } catch (error) {
        console.error('❌ @supabase/supabase-js is MISSING');
    }

    console.log('\n--- Verification Complete ---');
}

verifySetup().catch(console.error);
