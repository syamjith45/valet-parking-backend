import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('4000'),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().min(10),
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string().min(1),
    WHATSAPP_API_URL: z.string().url().optional(),
    WHATSAPP_TOKEN: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const env = _env.data;
