import { db } from '../src/lib/db';

async function testConnection() {
    console.log('Testing connection to local SQLite database...');

    const tables = ['users', 'clients', 'vendors', 'projects', 'ledger_entries', 'office_expenses', 'company_profile'];

    for (const table of tables) {
        try {
            const row = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get();
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
            console.log(`Success: Table '${table}' found. Rows: ${count.count}`);
        } catch (error: any) {
            console.error(`Error querying table '${table}':`, error.message);
        }
    }
}

testConnection();
