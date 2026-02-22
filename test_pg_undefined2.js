const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const args = ['id__1', 'DEBIT', 10, 'desc', 'Cash', '2023-01-01', undefined, undefined, 'cf0aa1a5-812e-4b71-bdfc-af4fddb2e9d2', 'default-company', '2023-01-01', undefined, undefined, undefined];
        const pgSql = 'INSERT INTO ledger_entries (id, type, amount, description, payment_method, date, client_id, vendor_id, project_id, company_id, created_at, transaction_id, received_by, attachment_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)';
        const res = await pool.query(pgSql, args);
        console.log("Success:", res.rows);
    } catch (err) {
        console.error("Insert Error:", err.message);
    } finally {
        pool.end();
    }
}
main();
