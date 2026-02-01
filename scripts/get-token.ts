import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getToken() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: npx ts-node scripts/get-token.ts <email> <password>');
        process.exit(1);
    }

    console.log(`Logging in as ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Error signing in:', error.message);
        process.exit(1);
    }

    if (data.session) {
        console.log('\n--- JWT Token ---');
        console.log(data.session.access_token);
        console.log('-----------------\n');
        console.log('Use this token in the Authorization header: Bearer <token>');
    } else {
        console.error('No session returned.');
    }
}

getToken();
