import dotenv from 'dotenv';
dotenv.config();

console.log('--- ENV DEBUG ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL); // Only print URL, not KEY
console.log('--- END DEBUG ---');

try {
    const db = new URL(process.env.DATABASE_URL || '');
    console.log('DATABASE_URL parsed successfully by new URL()');
} catch (e) {
    console.error('DATABASE_URL failed new URL():', e);
}

try {
    const supa = new URL(process.env.SUPABASE_URL || '');
    console.log('SUPABASE_URL parsed successfully by new URL()');
} catch (e) {
    console.error('SUPABASE_URL failed new URL():', e);
}
