import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of envConfig) {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.join('=').trim().replace(/(^"|"$)/g, '');
            }
        }
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS labour_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id TEXT NOT NULL DEFAULT 'default-company',
                date DATE NOT NULL,
                mason_name TEXT NOT NULL,
                helper_name TEXT,
                mason_payment NUMERIC NOT NULL DEFAULT 0,
                labour_payment NUMERIC NOT NULL DEFAULT 0,
                work_description TEXT,
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Successfully created labour_reports table');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await pool.end();
    }
}

main();
